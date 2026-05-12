import { db } from '../db/client.js'
import { orders, orderLines, hiddenCustomers } from '../db/schema.js'
import { eq, inArray, sql } from 'drizzle-orm'

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
  is_hidden: boolean
}

export async function getHiddenPhones(): Promise<Set<string>> {
  const rows = await db.select({ phone: hiddenCustomers.phone }).from(hiddenCustomers)
  return new Set(rows.map(r => r.phone))
}

export async function hideCustomer(phone: string): Promise<void> {
  await db.insert(hiddenCustomers).values({ phone }).onConflictDoNothing()
}

export async function unhideCustomer(phone: string): Promise<void> {
  await db.delete(hiddenCustomers).where(eq(hiddenCustomers.phone, phone))
}

export async function getHiddenCustomers(): Promise<CustomerSummary[]> {
  const hiddenPhones = await getHiddenPhones()
  if (hiddenPhones.size === 0) return []

  const rows = await db
    .select({
      customer_phone: orders.customerPhone,
      customer_name: sql<string>`(array_agg(${orders.customerName} ORDER BY ${orders.createdAt} DESC))[1]`,
      order_count: sql<number>`count(*)::int`,
      total_spent: sql<number>`sum(${orders.totalPrice}::numeric)`,
      first_seen: sql<string>`min(${orders.orderDate})`,
      last_seen: sql<string>`max(${orders.orderDate})`,
    })
    .from(orders)
    .where(inArray(orders.customerPhone, Array.from(hiddenPhones)))
    .groupBy(orders.customerPhone)

  return rows.map(r => ({
    customer_phone: r.customer_phone,
    customer_name: r.customer_name,
    order_count: r.order_count,
    total_spent: Number(r.total_spent),
    first_seen: r.first_seen,
    last_seen: r.last_seen,
  }))
}

export async function getCustomers(opts: {
  search?: string
  sort?: string
  limit?: number
}): Promise<CustomerSummary[]> {
  const { search, sort, limit = 50 } = opts

  const [rows, hiddenPhones] = await Promise.all([
    db
      .select({
        customer_phone: orders.customerPhone,
        // most recent name for this phone number
        customer_name: sql<string>`(array_agg(${orders.customerName} ORDER BY ${orders.createdAt} DESC))[1]`,
        order_count: sql<number>`count(*)::int`,
        total_spent: sql<number>`sum(${orders.totalPrice}::numeric)`,
        first_seen: sql<string>`min(${orders.orderDate})`,
        last_seen: sql<string>`max(${orders.orderDate})`,
      })
      .from(orders)
      .groupBy(orders.customerPhone),
    getHiddenPhones(),
  ])

  let customers: CustomerSummary[] = rows
    .filter(r => !hiddenPhones.has(r.customer_phone))
    .map((r) => ({
    customer_phone: r.customer_phone,
    customer_name: r.customer_name,
    order_count: r.order_count,
    total_spent: Number(r.total_spent),
    first_seen: r.first_seen,
    last_seen: r.last_seen,
  }))

  if (search) {
    const q = search.toLowerCase()
    customers = customers.filter(
      (c) => c.customer_name.toLowerCase().includes(q) || c.customer_phone.includes(q)
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
  const [customerOrders, hiddenPhones] = await Promise.all([
    db.select().from(orders).where(eq(orders.customerPhone, phone)),
    getHiddenPhones(),
  ])

  if (customerOrders.length === 0) return null

  const sortedByDate = [...customerOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const total_spent = customerOrders.reduce((s, o) => s + parseFloat(o.totalPrice), 0)
  const dates = customerOrders.map((o) => o.orderDate).sort()

  const lines = await db
    .select()
    .from(orderLines)
    .where(inArray(orderLines.orderId, customerOrders.map((o) => o.id)))

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
    .map((o) => ({
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
    is_hidden: hiddenPhones.has(phone),
  }
}
