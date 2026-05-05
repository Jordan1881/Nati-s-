import { Router } from 'express'
import { getCustomers, getCustomerByPhone } from '../services/customers.service.js'

const router = Router()

router.get('/', async (req, res) => {
  const { search, sort, limit, phone } = req.query as Record<string, string | undefined>

  if (phone !== undefined) {
    const customer = await getCustomerByPhone(phone)
    if (!customer) {
      res.status(404).json({ error: 'not_found', message: 'No orders found for this phone' })
      return
    }
    res.json(customer)
    return
  }

  const limitNum = limit ? Math.min(parseInt(limit, 10) || 50, 200) : 50
  const customers = await getCustomers({ search, sort, limit: limitNum })
  res.json(customers)
})

export default router
