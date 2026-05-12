import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../services/customers.service', () => ({
  getCustomers: vi.fn(),
  getCustomerByPhone: vi.fn(),
  hideCustomer: vi.fn(),
  unhideCustomer: vi.fn(),
  getHiddenCustomers: vi.fn(),
}))

import app from '../index'
import * as svc from '../services/customers.service'

const MOCK_CUSTOMERS = [
  {
    customer_phone: '0501234567',
    customer_name: 'ישראל ישראלי',
    order_count: 5,
    total_spent: 680,
    first_seen: '2026-01-10',
    last_seen: '2026-05-02',
  },
  {
    customer_phone: '0509876543',
    customer_name: 'שרה כהן',
    order_count: 2,
    total_spent: 220,
    first_seen: '2026-03-07',
    last_seen: '2026-04-04',
  },
]

const MOCK_DETAIL = {
  ...MOCK_CUSTOMERS[0],
  favorite_items: [
    { name: 'ברסקט עגל', unit_label: '½ ק"ג', quantity: 8 },
    { name: 'חומוס', unit_label: null, quantity: 5 },
  ],
  recent_orders: [
    { id: 10, daily_number: 3, order_date: '2026-05-02', total_price: 180, status: null, payment_status: 'paid' },
  ],
  is_hidden: false,
}

let authCookies: string[]

beforeAll(async () => {
  const res = await request(app).post('/auth/login').send({ password: 'test-password' })
  authCookies = res.headers['set-cookie'] as unknown as string[]
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/customers', () => {
  it('returns 200 with customer list', async () => {
    vi.mocked(svc.getCustomers).mockResolvedValue(MOCK_CUSTOMERS)
    const res = await request(app).get('/api/customers').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].customer_name).toBe('ישראל ישראלי')
  })

  it('passes search and sort to service', async () => {
    vi.mocked(svc.getCustomers).mockResolvedValue([])
    await request(app).get('/api/customers?search=שרה&sort=spent').set('Cookie', authCookies)
    expect(svc.getCustomers).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'שרה', sort: 'spent' })
    )
  })

  it('caps limit at 200', async () => {
    vi.mocked(svc.getCustomers).mockResolvedValue([])
    await request(app).get('/api/customers?limit=999').set('Cookie', authCookies)
    expect(svc.getCustomers).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200 })
    )
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/customers')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/customers?phone=:phone', () => {
  it('returns 200 with customer detail', async () => {
    vi.mocked(svc.getCustomerByPhone).mockResolvedValue(MOCK_DETAIL)
    const res = await request(app)
      .get('/api/customers?phone=0501234567')
      .set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.body.customer_phone).toBe('0501234567')
    expect(res.body.favorite_items).toHaveLength(2)
    expect(res.body.recent_orders).toHaveLength(1)
  })

  it('returns 404 when phone not found', async () => {
    vi.mocked(svc.getCustomerByPhone).mockResolvedValue(null)
    const res = await request(app)
      .get('/api/customers?phone=0500000000')
      .set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })

  it('favorites ordered by quantity descending', async () => {
    vi.mocked(svc.getCustomerByPhone).mockResolvedValue(MOCK_DETAIL)
    const res = await request(app)
      .get('/api/customers?phone=0501234567')
      .set('Cookie', authCookies)
    const items: { quantity: number }[] = res.body.favorite_items
    expect(items[0].quantity).toBeGreaterThanOrEqual(items[1].quantity)
  })
})
