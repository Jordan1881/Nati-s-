import { Router } from 'express'
import { z } from 'zod'
import * as svc from '../services/orders.service.js'

const router = Router()

const createOrderSchema = z.object({
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  pickup_time: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  payment_method: z.enum(['cash', 'credit']).nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid']).nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z
    .array(
      z.object({
        menu_item_id: z.number().int().positive(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
})

function serializeOrder(row: {
  id: number
  dailyNumber: number
  orderDate: string
  customerName: string
  customerPhone: string
  pickupTime?: string | null
  status?: string | null
  paymentMethod?: string | null
  paymentStatus?: string | null
  notes?: string | null
  totalPrice: string
  kitchenPrintedAt?: Date | string | null
  customerPrintedAt?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}) {
  return {
    id: row.id,
    daily_number: row.dailyNumber,
    order_date: row.orderDate,
    customer_name: row.customerName,
    customer_phone: row.customerPhone,
    pickup_time: row.pickupTime ?? null,
    status: row.status ?? null,
    payment_method: row.paymentMethod ?? null,
    payment_status: row.paymentStatus ?? null,
    notes: row.notes ?? null,
    total_price: parseFloat(row.totalPrice),
    kitchen_printed_at:
      row.kitchenPrintedAt instanceof Date
        ? row.kitchenPrintedAt.toISOString()
        : (row.kitchenPrintedAt ?? null),
    customer_printed_at:
      row.customerPrintedAt instanceof Date
        ? row.customerPrintedAt.toISOString()
        : (row.customerPrintedAt ?? null),
    created_at:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updated_at:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }
}

function serializeLine(line: {
  id: number
  menuItemId: number
  quantity: number
  itemNameSnap: string
  unitLabelSnap?: string | null
  priceSnap: string
  categorySnap: string
  orderId?: number
}) {
  return {
    id: line.id,
    menu_item_id: line.menuItemId,
    quantity: line.quantity,
    item_name_snap: line.itemNameSnap,
    unit_label_snap: line.unitLabelSnap ?? null,
    price_snap: parseFloat(line.priceSnap),
    category_snap: line.categorySnap,
  }
}

const patchOrderSchema = z.object({
  customer_name: z.string().min(1).optional(),
  customer_phone: z.string().min(1).optional(),
  pickup_time: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  payment_method: z.enum(['cash', 'credit']).nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid']).nullable().optional(),
  notes: z.string().nullable().optional(),
})

const replaceLinesSchema = z.object({
  lines: z
    .array(
      z.object({
        menu_item_id: z.number().int().positive(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
})

router.get('/', async (req, res) => {
  const { date, from, to, phone } = req.query as {
    date?: string
    from?: string
    to?: string
    phone?: string
  }

  const rows = await svc.listOrders({ date, from, to, phone })
  res.json(
    rows.map((row) => ({
      ...serializeOrder(row),
      line_count: Number(row.lineCount),
    }))
  )
})

router.post('/', async (req, res) => {
  const result = createOrderSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.flatten() })
    return
  }

  try {
    const order = await svc.createOrder(result.data)
    res.status(201).json({
      ...serializeOrder(order),
      lines: order.lines.map(serializeLine),
    })
  } catch (err) {
    if (err instanceof Error && (err.message.includes('inactive') || err.message.includes('not found'))) {
      res.status(400).json({ error: err.message })
      return
    }
    throw err
  }
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const order = await svc.getOrder(id)
  if (!order) { res.status(404).json({ error: 'Order not found' }); return }

  res.json({ ...serializeOrder(order), lines: order.lines.map(serializeLine) })
})

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const result = patchOrderSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.flatten() })
    return
  }

  const order = await svc.updateOrderHeader(id, result.data)
  if (!order) { res.status(404).json({ error: 'Order not found' }); return }

  res.json({ ...serializeOrder(order), lines: order.lines.map(serializeLine) })
})

router.put('/:id/lines', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const result = replaceLinesSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.flatten() })
    return
  }

  try {
    const order = await svc.replaceOrderLines(id, result.data.lines)
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }
    res.json({ ...serializeOrder(order), lines: order.lines.map(serializeLine) })
  } catch (err) {
    if (err instanceof Error && (err.message.includes('inactive') || err.message.includes('not found'))) {
      res.status(400).json({ error: err.message })
      return
    }
    throw err
  }
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const deleted = await svc.deleteOrder(id)
  if (!deleted) { res.status(404).json({ error: 'Order not found' }); return }

  res.sendStatus(204)
})

export default router
