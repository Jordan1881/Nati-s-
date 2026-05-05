import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.js'
import menuItemsRouter from './routes/menuItems.js'
import ordersRouter from './routes/orders.js'
import summaryRouter from './routes/summary.js'
import printRouter from './routes/print.js'
import customersRouter from './routes/customers.js'
import backupRouter from './routes/backup.js'
import { authMiddleware } from './middleware/auth.js'

const app = express()

app.use(cookieParser(process.env.COOKIE_SECRET ?? 'dev-secret'))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/auth', authRouter)
app.use('/api', authMiddleware)
app.use('/print', authMiddleware)

app.get('/api/ping', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/menu-items', menuItemsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/summary', summaryRouter)
app.use('/api/customers', customersRouter)
app.use('/api/backup', backupRouter)
app.use('/print', printRouter)

const PORT = process.env.PORT ?? 3000

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend on http://localhost:${PORT}`)
  })
}

export default app
