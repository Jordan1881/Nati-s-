import { Router } from 'express'
import * as svc from '../services/orders.service.js'
import { renderKitchenBon } from '../print/kitchen-bon.js'
import { renderCustomerSlip } from '../print/customer-slip.js'
import { wrapDocument } from '../print/render.js'
import type { PrintOrder, PrintLine } from '../print/types.js'

const router = Router()

type OrderRow = NonNullable<Awaited<ReturnType<typeof svc.getOrder>>>

function toPrintOrder(row: OrderRow): PrintOrder {
  return {
    dailyNumber: row.dailyNumber,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    pickupTime: row.pickupTime ?? null,
    paymentMethod: row.paymentMethod ?? null,
    paymentStatus: row.paymentStatus ?? null,
    notes: row.notes ?? null,
    totalPrice: row.totalPrice,
    createdAt: row.createdAt,
  }
}

function toPrintLines(lines: OrderRow['lines']): PrintLine[] {
  return lines.map((l) => ({
    id: l.id,
    quantity: l.quantity,
    itemNameSnap: l.itemNameSnap,
    unitLabelSnap: l.unitLabelSnap ?? null,
    categorySnap: l.categorySnap,
    priceSnap: l.priceSnap,
  }))
}

// GET /print/order/:id — combined kitchen + customer, marks both printed (first time only)
router.get('/order/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).send('Invalid id'); return }

  const row = await svc.getOrder(id)
  if (!row) { res.status(404).send('Order not found'); return }

  await svc.markPrinted(id, 'both')

  const order = toPrintOrder(row)
  const lines = toPrintLines(row.lines)
  const body = renderKitchenBon(order, lines) + '\n' + renderCustomerSlip(order, lines)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(wrapDocument(`הזמנה #${order.dailyNumber}`, body))
})

// GET /print/order/:id/kitchen — kitchen only, marks kitchen printed (first time only)
router.get('/order/:id/kitchen', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).send('Invalid id'); return }

  const row = await svc.getOrder(id)
  if (!row) { res.status(404).send('Order not found'); return }

  await svc.markPrinted(id, 'kitchen')

  const order = toPrintOrder(row)
  const lines = toPrintLines(row.lines)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(wrapDocument(`בון מטבח — הזמנה #${order.dailyNumber}`, renderKitchenBon(order, lines)))
})

// GET /print/order/:id/customer — customer only, marks customer printed (first time only)
router.get('/order/:id/customer', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).send('Invalid id'); return }

  const row = await svc.getOrder(id)
  if (!row) { res.status(404).send('Order not found'); return }

  await svc.markPrinted(id, 'customer')

  const order = toPrintOrder(row)
  const lines = toPrintLines(row.lines)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(wrapDocument(`שובר לקוח — הזמנה #${order.dailyNumber}`, renderCustomerSlip(order, lines)))
})

// GET /print/bonim/:date — all kitchen bons for date, sorted by daily_number ASC, no timestamp updates
router.get('/bonim/:date', async (req, res) => {
  const { date } = req.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).send('Invalid date format. Use YYYY-MM-DD.')
    return
  }

  const rows = await svc.getOrdersWithLinesForDate(date)

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  })

  const body =
    rows.length === 0
      ? '<div style="font-size:18pt;text-align:center;padding:20mm">אין הזמנות ליום זה</div>'
      : rows
          .map((row) => renderKitchenBon(toPrintOrder(row), toPrintLines(row.lines)))
          .join('\n')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(wrapDocument(`קובץ בונים — ${formattedDate}`, body))
})

export default router
