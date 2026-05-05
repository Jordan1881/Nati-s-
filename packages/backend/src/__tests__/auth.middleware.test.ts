import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../middleware/auth'

function makeReq(signedCookies: Record<string, string> = {}): Request {
  return { signedCookies } as unknown as Request
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

describe('authMiddleware', () => {
  let next: NextFunction

  beforeEach(() => {
    next = vi.fn()
  })

  it('rejects request without session cookie → 401', () => {
    const req = makeReq({})
    const res = makeRes()
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })

  it('accepts request with valid signed session cookie', () => {
    const req = makeReq({ 'natis-session': 'ok' })
    const res = makeRes()
    authMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects request with tampered/unsigned cookie (value !== ok)', () => {
    const req = makeReq({ 'natis-session': 'tampered' })
    const res = makeRes()
    authMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })
})
