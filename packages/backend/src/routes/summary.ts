import { Router } from 'express'
import { getSummary } from '../services/summary.service.js'

const router = Router()

router.get('/:date', async (req, res) => {
  const { date } = req.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'invalid_date', message: 'Date must be YYYY-MM-DD' })
    return
  }
  const summary = await getSummary(date)
  res.json(summary)
})

export default router
