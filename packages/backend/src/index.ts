import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth'
import menuItemsRouter from './routes/menuItems'
import ordersRouter from './routes/orders'
import summaryRouter from './routes/summary'
import printRouter from './routes/print'
import customersRouter from './routes/customers'
import backupRouter from './routes/backup'
import { authMiddleware } from './middleware/auth'

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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend on http://localhost:${PORT}`)
  })
}

export default app
