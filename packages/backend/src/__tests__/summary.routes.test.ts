import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../services/summary.service', () => ({
  getSummary: vi.fn(),
}))

import app from '../index'
import * as svc from '../services/summary.service'

const MOCK_SUMMARY = {
  date: '2026-05-15',
  order_count: 2,
  total_revenue: 290.0,
  payment_breakdown: {
    cash: { count: 1, total: 110.0 },
    credit: { count: 0, total: 0 },
    unpaid: { count: 1, total: 180.0, orders: [{ id: 2, daily_number: 2 }] },
  },
  items_sold: [
    {
      menu_item_id: 1,
      name: 'ברסקט עגל',
      unit_label: '½ ק"ג',
      category: 'תבשילים',
      quantity: 4,
      revenue: 220.0,
    },
  ],
  items_rolled_up: [
    { name: 'ברסקט עגל', category: 'תבשילים', total_quantity: 4, revenue: 220.0 },
  ],
}

let authCookies: string[] = []

beforeAll(async () => {
  const res = await request(app).post('/auth/login').send({ password: 'test-password' })
  authCookies = res.headers['set-cookie'] as string[]
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/summary/:date', () => {
  it('returns 200 with summary data', async () => {
    vi.mocked(svc.getSummary).mockResolvedValue(MOCK_SUMMARY)
    const res = await request(app).get('/api/summary/2026-05-15').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.body.date).toBe('2026-05-15')
    expect(res.body.order_count).toBe(2)
    expect(res.body.total_revenue).toBe(290.0)
  })

  it('returns correct payment breakdown shape', async () => {
    vi.mocked(svc.getSummary).mockResolvedValue(MOCK_SUMMARY)
    const res = await request(app).get('/api/summary/2026-05-15').set('Cookie', authCookies)
    expect(res.body.payment_breakdown.cash.count).toBe(1)
    expect(res.body.payment_breakdown.credit.count).toBe(0)
    expect(res.body.payment_breakdown.unpaid.count).toBe(1)
    expect(res.body.payment_breakdown.unpaid.orders).toEqual([{ id: 2, daily_number: 2 }])
  })

  it('returns items_sold and items_rolled_up', async () => {
    vi.mocked(svc.getSummary).mockResolvedValue(MOCK_SUMMARY)
    const res = await request(app).get('/api/summary/2026-05-15').set('Cookie', authCookies)
    expect(res.body.items_sold).toHaveLength(1)
    expect(res.body.items_rolled_up).toHaveLength(1)
    expect(res.body.items_sold[0].name).toBe('ברסקט עגל')
  })

  it('calls getSummary with the date param', async () => {
    vi.mocked(svc.getSummary).mockResolvedValue(MOCK_SUMMARY)
    await request(app).get('/api/summary/2026-05-15').set('Cookie', authCookies)
    expect(svc.getSummary).toHaveBeenCalledWith('2026-05-15')
  })

  it('returns 400 on invalid date format', async () => {
    const res = await request(app).get('/api/summary/15-05-2026').set('Cookie', authCookies)
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth cookie', async () => {
    const res = await request(app).get('/api/summary/2026-05-15')
    expect(res.status).toBe(401)
  })
})
