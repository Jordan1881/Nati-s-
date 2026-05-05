import type { RequestHandler } from 'express'

export const authMiddleware: RequestHandler = (req, res, next) => {
  if (req.signedCookies['natis-session'] === 'ok') {
    next()
  } else {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
