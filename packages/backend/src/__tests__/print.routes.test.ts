import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../services/orders.service', () => ({
  listOrders: vi.fn(),
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  updateOrderHeader: vi.fn(),
  replaceOrderLines: vi.fn(),
  deleteOrder: vi.fn(),
  markPrinted: vi.fn(),
  getOrdersWithLinesForDate: vi.fn(),
  computeOrderLines: vi.fn(),
  computeDailyNumber: vi.fn(),
}))

import app from '../index'
import * as svc from '../services/orders.service'

const MOCK_ORDER = {
  id: 1,
  dailyNumber: 3,
  orderDate: '2026-05-15',
  customerName: 'לילי כהן',
  customerPhone: '050-1234567',
  pickupTime: '09:30',
  status: null,
  paymentMethod: 'cash',
  paymentStatus: 'paid',
  notes: 'בלי חריף',
  totalPrice: '110.00',
  kitchenPrintedAt: null,
  customerPrintedAt: null,
  createdAt: new Date('2026-05-14T19:42:00Z'),
  updatedAt: new Date('2026-05-14T19:42:00Z'),
  lines: [
    {
      id: 1,
      orderId: 1,
      menuItemId: 1,
      quantity: 2,
      itemNameSnap: 'ברסקט עגל',
      unitLabelSnap: '½ ק"ג',
      priceSnap: '55.00',
      categorySnap: 'תבשילים',
    },
  ],
}

let authCookies: string[] = []

beforeAll(async () => {
  process.env.APP_PASSWORD = 'test-password'
  process.env.COOKIE_SECRET = 'test-secret'
  const res = await request(app).post('/auth/login').send({ password: 'test-password' })
  authCookies = res.headers['set-cookie'] as string[]
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(svc.markPrinted).mockResolvedValue(true)
})

describe('GET /print/order/:id', () => {
  it('returns 200 HTML with both kitchen and customer sections', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app).get('/print/order/1').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.text).toContain('kitchen-bon')
    expect(res.text).toContain('customer-slip')
    expect(res.text).toContain('הזמנה #3')
    expect(res.text).toContain('ברסקט עגל')
    expect(res.text).toContain('לילי כהן')
    expect(res.text).toContain('window.print()')
  })

  it('calls markPrinted with "both"', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    await request(app).get('/print/order/1').set('Cookie', authCookies)
    expect(svc.markPrinted).toHaveBeenCalledWith(1, 'both')
  })

  it('returns 404 when order not found', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(null)
    const res = await request(app).get('/print/order/999').set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/print/order/1')
    expect(res.status).toBe(401)
  })
})

describe('GET /print/order/:id/kitchen', () => {
  it('returns 200 HTML with kitchen bon only', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app).get('/print/order/1/kitchen').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.text).toContain('<section class="page kitchen-bon"')
    expect(res.text).not.toContain('<section class="page customer-slip"')
    expect(res.text).toContain('הזמנה #3')
    expect(res.text).not.toContain('לילי כהן')
  })

  it('calls markPrinted with "kitchen"', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    await request(app).get('/print/order/1/kitchen').set('Cookie', authCookies)
    expect(svc.markPrinted).toHaveBeenCalledWith(1, 'kitchen')
  })

  it('returns 404 when order not found', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(null)
    const res = await request(app).get('/print/order/999/kitchen').set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/print/order/1/kitchen')
    expect(res.status).toBe(401)
  })
})

describe('GET /print/order/:id/customer', () => {
  it('returns 200 HTML with customer slip only', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app).get('/print/order/1/customer').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.text).toContain('<section class="page customer-slip"')
    expect(res.text).not.toContain('<section class="page kitchen-bon"')
    expect(res.text).toContain('לילי כהן')
    expect(res.text).toContain('050-1234567')
  })

  it('calls markPrinted with "customer"', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    await request(app).get('/print/order/1/customer').set('Cookie', authCookies)
    expect(svc.markPrinted).toHaveBeenCalledWith(1, 'customer')
  })

  it('returns 404 when order not found', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(null)
    const res = await request(app).get('/print/order/999/customer').set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/print/order/1/customer')
    expect(res.status).toBe(401)
  })
})

describe('GET /print/vouchers/:date', () => {
  it('returns 200 HTML for a valid date', async () => {
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue([MOCK_ORDER] as any)
    const res = await request(app).get('/print/vouchers/2026-05-15').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
  })

  it('renders compact customer slips (not full-page) in the bulk voucher print', async () => {
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue([MOCK_ORDER] as any)
    const res = await request(app).get('/print/vouchers/2026-05-15').set('Cookie', authCookies)
    expect(res.text).toContain('customer-slip compact')
    expect(res.text).not.toContain('<section class="page customer-slip">')
  })

  it('wraps each group of 3 slips in a voucher-page div', async () => {
    const threeOrders = [
      { ...MOCK_ORDER, id: 1, dailyNumber: 1 },
      { ...MOCK_ORDER, id: 2, dailyNumber: 2 },
      { ...MOCK_ORDER, id: 3, dailyNumber: 3 },
    ]
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue(threeOrders as any)
    const res = await request(app).get('/print/vouchers/2026-05-15').set('Cookie', authCookies)
    const voucherPageCount = (res.text.match(/class="voucher-page"/g) ?? []).length
    expect(voucherPageCount).toBe(1)
    const slipCutCount = (res.text.match(/class="slip-cut"/g) ?? []).length
    expect(slipCutCount).toBe(2)
  })

  it('splits 4 orders into 2 voucher-page wrappers (3+1)', async () => {
    const fourOrders = [1, 2, 3, 4].map(n => ({ ...MOCK_ORDER, id: n, dailyNumber: n }))
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue(fourOrders as any)
    const res = await request(app).get('/print/vouchers/2026-05-15').set('Cookie', authCookies)
    const voucherPageCount = (res.text.match(/class="voucher-page"/g) ?? []).length
    expect(voucherPageCount).toBe(2)
    const slipCutCount = (res.text.match(/class="slip-cut"/g) ?? []).length
    expect(slipCutCount).toBe(2)
  })

  it('returns empty-state message when no orders', async () => {
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue([])
    const res = await request(app).get('/print/vouchers/2026-05-15').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.text).toContain('אין הזמנות ליום זה')
    expect(res.text).not.toContain('class="voucher-page"')
  })

  it('returns 400 on invalid date format', async () => {
    const res = await request(app).get('/print/vouchers/15-05-2026').set('Cookie', authCookies)
    expect(res.status).toBe(400)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/print/vouchers/2026-05-15')
    expect(res.status).toBe(401)
  })

  it('individual /customer route still renders full-size slip (not compact)', async () => {
    vi.mocked(svc.getOrder).mockResolvedValue(MOCK_ORDER as any)
    const res = await request(app).get('/print/order/1/customer').set('Cookie', authCookies)
    expect(res.text).toContain('<section class="page customer-slip">')
    expect(res.text).not.toContain('class="page customer-slip compact"')
  })
})

describe('GET /print/bonim/:date', () => {
  it('returns 200 HTML with all kitchen bons for date', async () => {
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue([MOCK_ORDER] as any)
    const res = await request(app).get('/print/bonim/2026-05-15').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.text).toContain('<section class="page kitchen-bon"')
    expect(res.text).toContain('הזמנה #3')
    expect(res.text).not.toContain('<section class="page customer-slip"')
  })

  it('does NOT call markPrinted', async () => {
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue([MOCK_ORDER] as any)
    await request(app).get('/print/bonim/2026-05-15').set('Cookie', authCookies)
    expect(svc.markPrinted).not.toHaveBeenCalled()
  })

  it('returns 200 with empty-state message when no orders', async () => {
    vi.mocked(svc.getOrdersWithLinesForDate).mockResolvedValue([])
    const res = await request(app).get('/print/bonim/2026-05-15').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.text).toContain('אין הזמנות ליום זה')
  })

  it('returns 400 on invalid date format', async () => {
    const res = await request(app).get('/print/bonim/15-05-2026').set('Cookie', authCookies)
    expect(res.status).toBe(400)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/print/bonim/2026-05-15')
    expect(res.status).toBe(401)
  })
})
