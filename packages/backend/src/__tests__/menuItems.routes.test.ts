import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../services/menuItems.service', () => ({
  listMenuItems: vi.fn(),
  getMenuItemById: vi.fn(),
  createMenuItem: vi.fn(),
  updateMenuItem: vi.fn(),
  softDeleteMenuItem: vi.fn(),
}))

import app from '../index'
import * as svc from '../services/menuItems.service'

const NOW = new Date('2026-01-01T00:00:00.000Z')

const MOCK_ITEM = {
  id: 1,
  name: 'ברסקט עגל',
  category: 'תבשילים',
  unitLabel: '½ ק״ג',
  price: '55.00',
  active: true,
  displayOrder: 0,
  createdAt: NOW,
  updatedAt: NOW,
}

let authCookies: string[] = []

beforeAll(async () => {
  const res = await request(app).post('/auth/login').send({ password: 'test-password' })
  authCookies = res.headers['set-cookie'] as string[]
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/menu-items', () => {
  it('returns all items', async () => {
    vi.mocked(svc.listMenuItems).mockResolvedValue([MOCK_ITEM])
    const res = await request(app).get('/api/menu-items').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('ברסקט עגל')
    expect(res.body[0].unit_label).toBe('½ ק״ג')
    expect(typeof res.body[0].price).toBe('number')
  })

  it('passes active=true filter', async () => {
    vi.mocked(svc.listMenuItems).mockResolvedValue([MOCK_ITEM])
    await request(app).get('/api/menu-items?active=true').set('Cookie', authCookies)
    expect(svc.listMenuItems).toHaveBeenCalledWith(true)
  })

  it('passes active=false filter', async () => {
    vi.mocked(svc.listMenuItems).mockResolvedValue([])
    await request(app).get('/api/menu-items?active=false').set('Cookie', authCookies)
    expect(svc.listMenuItems).toHaveBeenCalledWith(false)
  })

  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/api/menu-items')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/menu-items/:id', () => {
  it('returns item by id', async () => {
    vi.mocked(svc.getMenuItemById).mockResolvedValue(MOCK_ITEM)
    const res = await request(app).get('/api/menu-items/1').set('Cookie', authCookies)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(svc.getMenuItemById).mockResolvedValue(undefined)
    const res = await request(app).get('/api/menu-items/999').set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/menu-items', () => {
  it('creates item and returns 201', async () => {
    vi.mocked(svc.createMenuItem).mockResolvedValue(MOCK_ITEM)
    const res = await request(app)
      .post('/api/menu-items')
      .set('Cookie', authCookies)
      .send({ name: 'ברסקט עגל', category: 'תבשילים', price: 55 })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('ברסקט עגל')
  })

  it('returns 400 on missing required fields', async () => {
    const res = await request(app)
      .post('/api/menu-items')
      .set('Cookie', authCookies)
      .send({ name: 'test' })  // missing category and price
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('details')
  })

  it('returns 400 when price is negative', async () => {
    const res = await request(app)
      .post('/api/menu-items')
      .set('Cookie', authCookies)
      .send({ name: 'test', category: 'תבשילים', price: -5 })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/menu-items/:id', () => {
  it('updates item and returns 200', async () => {
    const updated = { ...MOCK_ITEM, name: 'ברסקט חדש' }
    vi.mocked(svc.updateMenuItem).mockResolvedValue(updated)
    const res = await request(app)
      .patch('/api/menu-items/1')
      .set('Cookie', authCookies)
      .send({ name: 'ברסקט חדש' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('ברסקט חדש')
  })

  it('returns 404 when not found', async () => {
    vi.mocked(svc.updateMenuItem).mockResolvedValue(undefined)
    const res = await request(app)
      .patch('/api/menu-items/999')
      .set('Cookie', authCookies)
      .send({ name: 'test' })
    expect(res.status).toBe(404)
  })

  it('returns 400 on invalid input', async () => {
    const res = await request(app)
      .patch('/api/menu-items/1')
      .set('Cookie', authCookies)
      .send({ price: 'not-a-number' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('details')
  })
})

describe('DELETE /api/menu-items/:id (soft delete)', () => {
  it('soft-deletes item and returns 204', async () => {
    vi.mocked(svc.softDeleteMenuItem).mockResolvedValue({ ...MOCK_ITEM, active: false })
    const res = await request(app)
      .delete('/api/menu-items/1')
      .set('Cookie', authCookies)
    expect(res.status).toBe(204)
    // Verifies soft-delete was called (not hard delete — row is preserved)
    expect(svc.softDeleteMenuItem).toHaveBeenCalledWith(1)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(svc.softDeleteMenuItem).mockResolvedValue(undefined)
    const res = await request(app)
      .delete('/api/menu-items/999')
      .set('Cookie', authCookies)
    expect(res.status).toBe(404)
  })
})
