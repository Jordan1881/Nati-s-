import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'

beforeAll(() => {
  process.env.APP_PASSWORD = 'test-password'
  process.env.COOKIE_SECRET = 'test-secret'
})

describe('POST /auth/login', () => {
  it('returns 204 + Set-Cookie on correct password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'test-password' })
    expect(res.status).toBe(204)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'wrong-password' })
    expect(res.status).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  it('returns 204 and clears cookie', async () => {
    const res = await request(app).post('/auth/logout')
    expect(res.status).toBe(204)
    const setCookie = res.headers['set-cookie'] as string[] | undefined
    const cleared = setCookie?.some((c: string) => c.includes('natis-session') && c.includes('Expires=Thu, 01 Jan 1970'))
    expect(cleared).toBe(true)
  })
})

describe('GET /api/ping', () => {
  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/api/ping')
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid cookie', async () => {
    // Login first to get a valid cookie
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ password: 'test-password' })
    const cookies = loginRes.headers['set-cookie'] as string[]
    expect(cookies).toBeDefined()

    const res = await request(app)
      .get('/api/ping')
      .set('Cookie', cookies)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
