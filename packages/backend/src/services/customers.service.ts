import { db } from '../db/client'
import { orders, orderLines } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

export interface CustomerSummary {
  customer_phone: string
  customer_name: string
  order_count: number
  total_spent: number
  first_seen: string
  last_seen: string
}

export interface FavoriteItem {
  name: string
  unit_label: string | null
  quantity: number
}

export interface RecentOrder {
  id: number
  daily_number: number
  order_date: string
  total_price: number
  status: string | null
  payment_status: string | null
}

export interface CustomerDetail extends CustomerSummary {
  favorite_items: FavoriteItem[]
  recent_orders: RecentOrder[]
}

export async function getCustomers(opts: {
  search?: string
  sort?: string
  limit?: number
}): Promise<CustomerSummary[]> {
  const { search, sort, limit = 50 } = opts

  const allOrders = await db.select().from(orders)

  const byPhone = new Map<string, typeof allOrders>()
  for (const order of allOrders) {
    if (!byPhone.has(order.customerPhone)) byPhone.set(order.customerPhone, [])
    byPhone.get(order.customerPhone)!.push(order)
  }

  let customers: CustomerSummary[] = []
  for (const [phone, orderList] of byPhone) {
    const sortedByDate = [...orderList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const total_spent = orderList.reduce((s, o) => s + parseFloat(o.totalPrice), 0)
    const dates = orderList.map(o => o.orderDate).sort()
    customers.push({
      customer_phone: phone,
      customer_name: sortedByDate[0].customerName,
      order_count: orderList.length,
      total_spent,
      first_seen: dates[0],
      last_seen: dates[dates.length - 1],
    })
  }

  if (search) {
    const q = search.toLowerCase()
    customers = customers.filter(
      c => c.customer_name.toLowerCase().includes(q) || c.customer_phone.includes(q)
    )
  }

  if (sort === 'spent') {
    customers.sort((a, b) => b.total_spent - a.total_spent)
  } else {
    customers.sort((a, b) => b.order_count - a.order_count)
  }

  return customers.slice(0, Math.min(limit, 200))
}

export async function getCustomerByPhone(phone: string): Promise<CustomerDetail | null> {
  const customerOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerPhone, phone))

  if (customerOrders.length === 0) return null

  const sortedByDate = [...customerOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const total_spent = customerOrders.reduce((s, o) => s + parseFloat(o.totalPrice), 0)
  const dates = customerOrders.map(o => o.orderDate).sort()

  const lines =
    customerOrders.length > 0
      ? await db
          .select()
          .from(orderLines)
          .where(inArray(orderLines.orderId, customerOrders.map(o => o.id)))
      : []

  const itemMap = new Map<string, FavoriteItem>()
  for (const line of lines) {
    const key = `${line.itemNameSnap}::${line.unitLabelSnap ?? ''}`
    const existing = itemMap.get(key)
    if (existing) {
      existing.quantity += line.quantity
    } else {
      itemMap.set(key, {
        name: line.itemNameSnap,
        unit_label: line.unitLabelSnap ?? null,
        quantity: line.quantity,
      })
    }
  }
  const favorite_items = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  const recent_orders = [...customerOrders]
    .sort((a, b) => {
      if (b.orderDate !== a.orderDate) return b.orderDate.localeCompare(a.orderDate)
      return b.dailyNumber - a.dailyNumber
    })
    .slice(0, 5)
    .map(o => ({
      id: o.id,
      daily_number: o.dailyNumber,
      order_date: o.orderDate,
      total_price: parseFloat(o.totalPrice),
      status: o.status,
      payment_status: o.paymentStatus,
    }))

  return {
    customer_phone: phone,
    customer_name: sortedByDate[0].customerName,
    order_count: customerOrders.length,
    total_spent,
    first_seen: dates[0],
    last_seen: dates[dates.length - 1],
    favorite_items,
    recent_orders,
  }
}
