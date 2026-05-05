import { db } from '../db/client.js'
import { orders, orderLines } from '../db/schema.js'
import { eq, inArray } from 'drizzle-orm'

export async function getSummary(date: string) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderDate, date))

  if (orderRows.length === 0) {
    return {
      date,
      order_count: 0,
      total_revenue: 0,
      payment_breakdown: {
        cash: { count: 0, total: 0 },
        credit: { count: 0, total: 0 },
        unpaid: { count: 0, total: 0, orders: [] as { id: number; daily_number: number }[] },
      },
      items_sold: [] as ItemSold[],
      items_rolled_up: [] as ItemRolledUp[],
    }
  }

  const total_revenue = orderRows.reduce((s, o) => s + parseFloat(o.totalPrice), 0)

  const cashOrders = orderRows.filter(o => o.paymentMethod === 'cash' && o.paymentStatus === 'paid')
  const creditOrders = orderRows.filter(o => o.paymentMethod === 'credit' && o.paymentStatus === 'paid')
  const unpaidOrders = orderRows.filter(o => o.paymentStatus !== 'paid')

  const payment_breakdown = {
    cash: {
      count: cashOrders.length,
      total: cashOrders.reduce((s, o) => s + parseFloat(o.totalPrice), 0),
    },
    credit: {
      count: creditOrders.length,
      total: creditOrders.reduce((s, o) => s + parseFloat(o.totalPrice), 0),
    },
    // Spec uses order_ids but we include daily_number so the UI can display "#12 → /orders/87"
    unpaid: {
      count: unpaidOrders.length,
      total: unpaidOrders.reduce((s, o) => s + parseFloat(o.totalPrice), 0),
      orders: unpaidOrders.map(o => ({ id: o.id, daily_number: o.dailyNumber })),
    },
  }

  const lineRows =
    orderRows.length > 0
      ? await db
          .select()
          .from(orderLines)
          .where(inArray(orderLines.orderId, orderRows.map(o => o.id)))
      : []

  // items_sold: one entry per distinct (menu_item_id, name, unit_label, category)
  const itemsMap = new Map<number, ItemSold>()
  for (const line of lineRows) {
    const existing = itemsMap.get(line.menuItemId)
    const lineRevenue = parseFloat(line.priceSnap) * line.quantity
    if (existing) {
      existing.quantity += line.quantity
      existing.revenue += lineRevenue
    } else {
      itemsMap.set(line.menuItemId, {
        menu_item_id: line.menuItemId,
        name: line.itemNameSnap,
        unit_label: line.unitLabelSnap ?? null,
        category: line.categorySnap,
        quantity: line.quantity,
        revenue: lineRevenue,
      })
    }
  }
  const items_sold = Array.from(itemsMap.values()).sort((a, b) => b.revenue - a.revenue)

  // items_rolled_up: group by (item_name_snap, category_snap), ignoring unit_label
  const rolledMap = new Map<string, ItemRolledUp>()
  for (const line of lineRows) {
    const key = `${line.categorySnap}::${line.itemNameSnap}`
    const existing = rolledMap.get(key)
    const lineRevenue = parseFloat(line.priceSnap) * line.quantity
    if (existing) {
      existing.total_quantity += line.quantity
      existing.revenue += lineRevenue
    } else {
      rolledMap.set(key, {
        name: line.itemNameSnap,
        category: line.categorySnap,
        total_quantity: line.quantity,
        revenue: lineRevenue,
      })
    }
  }
  const items_rolled_up = Array.from(rolledMap.values()).sort((a, b) => b.revenue - a.revenue)

  return { date, order_count: orderRows.length, total_revenue, payment_breakdown, items_sold, items_rolled_up }
}

interface ItemSold {
  menu_item_id: number
  name: string
  unit_label: string | null
  category: string
  quantity: number
  revenue: number
}

interface ItemRolledUp {
  name: string
  category: string
  total_quantity: number
  revenue: number
}
