import { Router } from 'express'
import { z } from 'zod'

const router = Router()

const loginSchema = z.object({ password: z.string() })

router.post('/login', (req, res) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request' })
    return
  }
  if (result.data.password !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: 'כניסה שגויה' })
    return
  }
  res.cookie('natis-session', 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    signed: true,
  })
  res.sendStatus(204)
})

router.post('/logout', (_req, res) => {
  res.clearCookie('natis-session')
  res.sendStatus(204)
})

export default router
