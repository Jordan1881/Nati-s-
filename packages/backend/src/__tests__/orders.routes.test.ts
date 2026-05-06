import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import { DomainError } from '../errors'

vi.mock('../services/orders.service', () => ({
  listOrders: vi.fn(),
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  updateOrderHeader: vi.fn(),
  replaceOrderLines: vi.fn(),
  deleteOrder: vi.fn(),
  computeOrderLines: vi.fn(),
  computeDailyNumber: vi.fn(),
}))

import app from '../index'
import * as svc from '../services/orders.service'

const MOCK_ORDER = {
  id: 1,
  dailyNumber: 1,
  orderDate: '2026-05-15',
  customerName: 'לילי כהן',
  customerPhone: '050-1234567',
  pickupTime: '09:30',
  status: null,
  paymentMethod: null,
  paymentStatus: null,
  notes: null,
  totalPrice: '322.50',
  kitchenPrintedAt: null,
  customerPrintedAt: null,
  createdAt: new Date('2026-05-15T07:00:00Z'),
  updatedAt: new Date('2026-05-15T07:00:00Z'),
  lines: [
    {
      id: 1,
      menuItemId: 1,
      quantity: 2,
      itemNameSnap: 'ברסקט עגל',
      unitLabelSnap: '½ ק"ג',
      priceSnap: '55.00',
      categorySnap: 'תבשילים',
      orderId: 1,
    },
  ],
}

const MOCK_LIST_ITEM = { ...MOCK_ORDER, lineCount: 2 }

let authCookies: string[] = []

beforeAll(async () => {
  const res = await request(app).post('/auth/login').send({ password: 'test-password' })
  authCookies = res.headers['set-cookie'] as string[]
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/orders', () => {
  it('returns 200 with list', async () => {
    vi.mocked(svc.listOrders).mockResolvedValue([MOCK_LIST_ITEM] as any)
    const res = await request(app).get('/api/orders').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].customer_name).toBe('לילי כהן')
    expect(res.body[0].line_count).toBe(2)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/api/orders')
    expect(res.status).toBe(401)
  })

  it('passes date filter to service', async () => {
    vi.mocked(svc.listOrders).mockResolvedValue([])
    await request(app).get('/api/orders?date=2026-05-15').set('Cookie', authCookies)
    expect(svc.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-05-15' })
    )
  })

  it('passes phone filter to service', async () => {
    vi.mocked(svc.listOrders).mockResolvedValue([])
    await request(app).get('/api/orders?phone=050-1234567').set('Cookie', authCookies)
    expect(svc.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '050-1234567' })
    )
  })
})

describe('POST /api/orders', () => {
  const validPayload = {
    order_date: '2026-05-15',
    customer_name: 'לילי כהן',
    customer_phone: '050-1234567',
    pickup_time: '09:30',
    lines: [{ menu_item_id: 1, quantity: 2 }],
  }

  it('returns 201 with full order on valid payload', async () => {
    vi.mocked(svc.createOrder).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', authCookies)
      .send(validPayload)
    expect(res.status).toBe(201)
  })

  it('serializes daily_number, total_price, lines correctly', async () => {
    vi.mocked(svc.createOrder).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', authCookies)
      .send(validPayload)
    expect(res.status).toBe(201)
    expect(res.body.daily_number).toBe(1)
    expect(res.body.total_price).toBe(322.5)
    expect(typeof res.body.total_price).toBe('number')
    expect(res.body.lines).toHaveLength(1)
    expect(res.body.lines[0].item_name_snap).toBe('ברסקט עגל')
    expect(res.body.lines[0].price_snap).toBe(55)
    expect(typeof res.body.lines[0].price_snap).toBe('number')
  })

  it('returns 400 on missing required fields (no customer_name)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', authCookies)
      .send({
        order_date: '2026-05-15',
        customer_phone: '050-1234567',
        lines: [{ menu_item_id: 1, quantity: 1 }],
      })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('details')
  })

  it('returns 400 on empty lines array', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', authCookies)
      .send({
        order_date: '2026-05-15',
        customer_name: 'לילי כהן',
        customer_phone: '050-1234567',
        lines: [],
      })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('details')
  })

  it('returns 400 on invalid order_date format', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', authCookies)
      .send({
        order_date: '15/05/2026',
        customer_name: 'לילי כהן',
        customer_phone: '050-1234567',
        lines: [{ menu_item_id: 1, quantity: 1 }],
      })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('details')
  })

  it('returns 400 when createOrder throws Error with inactive', async () => {
    vi.mocked(svc.createOrder).mockRejectedValue(new DomainError('menu_item_inactive', 'Menu item 3 is inactive'))
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', authCookies)
      .send(validPayload)
    expect(res.status).toBe(400)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).post('/api/orders').send(validPayload)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/orders/:id', () => {
  it('returns 200 with order and lines', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app).get('/api/orders/1').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
    expect(res.body.lines).toHaveLength(1)
    expect(res.body.lines[0].item_name_snap).toBe('ברסקט עגל')
    expect(res.body.lines[0].price_snap).toBe(55)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(null)
    const res = await request(app).get('/api/orders/999').set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/api/orders/1')
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/orders/:id', () => {
  it('returns 200 with updated order', async () => {
    const updated = { ...MOCK_ORDER, customerName: 'רונית לוי' }
    vi.mocked(svc.updateOrderHeader).mockResolvedValue(updated as any)
    const res = await request(app)
      .patch('/api/orders/1')
      .set('Cookie', authCookies)
      .send({ customer_name: 'רונית לוי' })
    expect(res.status).toBe(200)
    expect(res.body.customer_name).toBe('רונית לוי')
  })

  it('returns 400 on invalid input (empty customer_name)', async () => {
    const res = await request(app)
      .patch('/api/orders/1')
      .set('Cookie', authCookies)
      .send({ customer_name: '' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('details')
  })

  it('returns 404 when not found', async () => {
    vi.mocked(svc.updateOrderHeader).mockResolvedValue(null)
    const res = await request(app)
      .patch('/api/orders/999')
      .set('Cookie', authCookies)
      .send({ notes: 'test' })
    expect(res.status).toBe(404)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).patch('/api/orders/1').send({ notes: 'test' })
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/orders/:id/lines', () => {
  const validLines = { lines: [{ menu_item_id: 1, quantity: 3 }] }

  it('returns 200 with updated order and new lines', async () => {
    vi.mocked(svc.replaceOrderLines).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app)
      .put('/api/orders/1/lines')
      .set('Cookie', authCookies)
      .send(validLines)
    expect(res.status).toBe(200)
    expect(res.body.lines).toHaveLength(1)
  })

  it('returns 400 on empty lines array', async () => {
    const res = await request(app)
      .put('/api/orders/1/lines')
      .set('Cookie', authCookies)
      .send({ lines: [] })
    expect(res.status).toBe(400)
  })

  it('returns 400 when service throws inactive error', async () => {
    vi.mocked(svc.replaceOrderLines).mockRejectedValue(new DomainError('menu_item_inactive', 'Menu item 5 is inactive'))
    const res = await request(app)
      .put('/api/orders/1/lines')
      .set('Cookie', authCookies)
      .send(validLines)
    expect(res.status).toBe(400)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(svc.replaceOrderLines).mockResolvedValue(null)
    const res = await request(app)
      .put('/api/orders/999/lines')
      .set('Cookie', authCookies)
      .send(validLines)
    expect(res.status).toBe(404)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).put('/api/orders/1/lines').send(validLines)
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/orders/:id', () => {
  it('returns 204 on success', async () => {
    vi.mocked(svc.deleteOrder).mockResolvedValue(true)
    const res = await request(app).delete('/api/orders/1').set('Cookie', authCookies)
    expect(res.status).toBe(204)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(svc.deleteOrder).mockResolvedValue(false)
    const res = await request(app).delete('/api/orders/999').set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).delete('/api/orders/1')
    expect(res.status).toBe(401)
  })
})
