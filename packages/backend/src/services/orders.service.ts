import { db } from '../db/client'
import { orders, orderLines, menuItems } from '../db/schema'
import { eq, desc, asc, and, gte, lte, inArray, sql } from 'drizzle-orm'
import type { MenuItem } from './menuItems.service'
import { getActiveSaleDate } from '@natis/shared'

// ---------------------------------------------------------------------------
// Pure helpers (no DB calls)
// ---------------------------------------------------------------------------

export function computeOrderLines(
  menuItemMap: Map<number, MenuItem>,
  lineInputs: { menu_item_id: number; quantity: number }[]
): {
  lineInserts: Array<{
    menuItemId: number
    quantity: number
    itemNameSnap: string
    unitLabelSnap: string | null
    priceSnap: string
    categorySnap: string
  }>
  totalPrice: number
} {
  let totalPrice = 0
  const lineInserts = lineInputs.map((input) => {
    const item = menuItemMap.get(input.menu_item_id)
    if (!item) {
      throw new Error(`Menu item ${input.menu_item_id} not found`)
    }
    if (item.active === false) {
      throw new Error(`Menu item ${input.menu_item_id} is inactive`)
    }
    const unitPrice = parseFloat(item.price as string)
    totalPrice += unitPrice * input.quantity
    return {
      menuItemId: item.id,
      quantity: input.quantity,
      itemNameSnap: item.name,
      unitLabelSnap: item.unitLabel ?? null,
      priceSnap: item.price as string,
      categorySnap: item.category,
    }
  })
  return { lineInserts, totalPrice }
}

export function computeDailyNumber(existingMax: number): number {
  return existingMax + 1
}

// ---------------------------------------------------------------------------
// Async service functions
// ---------------------------------------------------------------------------

export async function listOrders(filters: {
  date?: string
  from?: string
  to?: string
  phone?: string
}) {
  // Default to active sale date when no filters provided
  const hasFilters =
    filters.date !== undefined ||
    filters.from !== undefined ||
    filters.to !== undefined ||
    filters.phone !== undefined

  const effectiveDate = !hasFilters
    ? getActiveSaleDate().toISOString().slice(0, 10)
    : filters.date

  const query = db
    .select({
      id: orders.id,
      dailyNumber: orders.dailyNumber,
      orderDate: orders.orderDate,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      pickupTime: orders.pickupTime,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      notes: orders.notes,
      totalPrice: orders.totalPrice,
      kitchenPrintedAt: orders.kitchenPrintedAt,
      customerPrintedAt: orders.customerPrintedAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      lineCount: sql<number>`count(${orderLines.id})::int`,
    })
    .from(orders)
    .leftJoin(orderLines, eq(orderLines.orderId, orders.id))

  const conditions = []
  if (effectiveDate) {
    conditions.push(eq(orders.orderDate, effectiveDate))
  }
  if (filters.from && filters.to) {
    conditions.push(and(gte(orders.orderDate, filters.from), lte(orders.orderDate, filters.to))!)
  }
  if (filters.phone) {
    conditions.push(eq(orders.customerPhone, filters.phone))
  }

  const withWhere =
    conditions.length > 0
      ? query.where(conditions.length === 1 ? conditions[0] : and(...(conditions as [any, ...any[]])))
      : query

  return withWhere
    .groupBy(orders.id)
    .orderBy(desc(orders.orderDate), asc(orders.dailyNumber))
}

export async function getOrder(id: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id))
  if (!order) return null
  const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, id))
  return { ...order, lines }
}

export async function updateOrderHeader(
  id: number,
  data: {
    customer_name?: string
    customer_phone?: string
    pickup_time?: string | null
    status?: string | null
    payment_method?: 'cash' | 'credit' | null
    payment_status?: 'paid' | 'unpaid' | null
    notes?: string | null
  }
) {
  const toSet: {
    customerName?: string
    customerPhone?: string
    pickupTime?: string | null
    status?: string | null
    paymentMethod?: string | null
    paymentStatus?: string | null
    notes?: string | null
    updatedAt: Date
  } = { updatedAt: new Date() }

  if (data.customer_name !== undefined) toSet.customerName = data.customer_name
  if (data.customer_phone !== undefined) toSet.customerPhone = data.customer_phone
  if ('pickup_time' in data) toSet.pickupTime = data.pickup_time as string | null
  if ('status' in data) toSet.status = data.status as string | null
  if ('payment_method' in data) toSet.paymentMethod = data.payment_method as string | null
  if ('payment_status' in data) toSet.paymentStatus = data.payment_status as string | null
  if ('notes' in data) toSet.notes = data.notes as string | null

  const [updated] = await db.update(orders).set(toSet).where(eq(orders.id, id)).returning()
  if (!updated) return null
  const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, id))
  return { ...updated, lines }
}

export async function replaceOrderLines(
  id: number,
  lineInputs: { menu_item_id: number; quantity: number }[]
) {
  return db.transaction(async (tx) => {
    const [existingOrder] = await tx.select().from(orders).where(eq(orders.id, id))
    if (!existingOrder) return null

    const itemIds = lineInputs.map((l) => l.menu_item_id)
    const fetchedItems = await tx.select().from(menuItems).where(inArray(menuItems.id, itemIds))
    const menuItemMap = new Map<number, MenuItem>(fetchedItems.map((item) => [item.id, item]))

    const { lineInserts, totalPrice } = computeOrderLines(menuItemMap, lineInputs)

    await tx.delete(orderLines).where(eq(orderLines.orderId, id))

    const newLines = await tx
      .insert(orderLines)
      .values(
        lineInserts.map((l) => ({
          orderId: id,
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          itemNameSnap: l.itemNameSnap,
          unitLabelSnap: l.unitLabelSnap,
          priceSnap: l.priceSnap,
          categorySnap: l.categorySnap,
        }))
      )
      .returning()

    const [updatedOrder] = await tx
      .update(orders)
      .set({ totalPrice: String(totalPrice.toFixed(2)), updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()

    return { ...updatedOrder, lines: newLines }
  })
}

export async function deleteOrder(id: number) {
  const deleted = await db.delete(orders).where(eq(orders.id, id)).returning({ id: orders.id })
  return deleted.length > 0
}

export async function markPrinted(id: number, which: 'kitchen' | 'customer' | 'both') {
  const [current] = await db
    .select({ kitchenPrintedAt: orders.kitchenPrintedAt, customerPrintedAt: orders.customerPrintedAt })
    .from(orders)
    .where(eq(orders.id, id))
  if (!current) return false

  const now = new Date()
  const toSet: { kitchenPrintedAt?: Date; customerPrintedAt?: Date } = {}
  if ((which === 'kitchen' || which === 'both') && !current.kitchenPrintedAt) {
    toSet.kitchenPrintedAt = now
  }
  if ((which === 'customer' || which === 'both') && !current.customerPrintedAt) {
    toSet.customerPrintedAt = now
  }
  if (Object.keys(toSet).length > 0) {
    await db.update(orders).set(toSet).where(eq(orders.id, id))
  }
  return true
}

export async function getOrdersWithLinesForDate(date: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderDate, date))
    .orderBy(asc(orders.dailyNumber))

  if (rows.length === 0) return []

  const orderIds = rows.map((o) => o.id)
  const lines = await db
    .select()
    .from(orderLines)
    .where(inArray(orderLines.orderId, orderIds))

  const linesByOrder = new Map<number, typeof lines>()
  for (const line of lines) {
    if (!linesByOrder.has(line.orderId)) linesByOrder.set(line.orderId, [])
    linesByOrder.get(line.orderId)!.push(line)
  }

  return rows.map((order) => ({ ...order, lines: linesByOrder.get(order.id) ?? [] }))
}

export async function createOrder(data: {
  order_date: string
  customer_name: string
  customer_phone: string
  pickup_time?: string | null
  status?: string | null
  payment_method?: 'cash' | 'credit' | null
  payment_status?: 'paid' | 'unpaid' | null
  notes?: string | null
  lines: { menu_item_id: number; quantity: number }[]
}) {
  return db.transaction(async (tx) => {
    // Fetch menu items for the given IDs
    const ids = data.lines.map((l) => l.menu_item_id)
    const fetchedItems = await tx.select().from(menuItems).where(inArray(menuItems.id, ids))

    const menuItemMap = new Map<number, MenuItem>(fetchedItems.map((item) => [item.id, item]))

    const { lineInserts, totalPrice } = computeOrderLines(menuItemMap, data.lines)

    // Compute daily number atomically
    const dailyResult = await tx
      .select({ val: sql<number>`COALESCE(MAX(${orders.dailyNumber}), 0) + 1` })
      .from(orders)
      .where(eq(orders.orderDate, data.order_date))
    const dailyNumber = dailyResult[0].val

    // Insert order
    const [orderRow] = await tx
      .insert(orders)
      .values({
        dailyNumber,
        orderDate: data.order_date,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        pickupTime: data.pickup_time ?? null,
        status: data.status ?? null,
        paymentMethod: data.payment_method ?? null,
        paymentStatus: data.payment_status ?? null,
        notes: data.notes ?? null,
        totalPrice: String(totalPrice.toFixed(2)),
      })
      .returning()

    // Insert order lines
    const insertedLines = await tx
      .insert(orderLines)
      .values(
        lineInserts.map((l) => ({
          orderId: orderRow.id,
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          itemNameSnap: l.itemNameSnap,
          unitLabelSnap: l.unitLabelSnap,
          priceSnap: l.priceSnap,
          categorySnap: l.categorySnap,
        }))
      )
      .returning()

    return { ...orderRow, lines: insertedLines }
  })
}
