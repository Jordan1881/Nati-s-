import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { db } from '../db/client.js'
import { orders, orderLines } from '../db/schema.js'
import { eq, inArray } from 'drizzle-orm'

const router = Router()

const BUCKET = 'backups'
const PRUNE_WEEKS = 12

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

router.get('/run', async (_req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'missing_env', message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const date = todayStr()

  try {
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.orderDate, date))

    const lineRows =
      orderRows.length > 0
        ? await db
            .select()
            .from(orderLines)
            .where(inArray(orderLines.orderId, orderRows.map(o => o.id)))
        : []

    const payload = {
      exported_at: new Date().toISOString(),
      date,
      orders: orderRows.map(o => ({
        ...o,
        lines: lineRows.filter(l => l.orderId === o.id),
      })),
    }

    const fileName = `orders-${date}.json`
    const filePath = `${fileName}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, JSON.stringify(payload, null, 2), {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadError) {
      console.error('[backup] upload error:', uploadError)
      res.status(500).json({ error: 'upload_failed', message: uploadError.message })
      return
    }

    // Prune files older than PRUNE_WEEKS weeks
    const { data: files, error: listError } = await supabase.storage.from(BUCKET).list()
    if (!listError && files) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - PRUNE_WEEKS * 7)
      const toDelete = files
        .filter(f => {
          const m = f.name.match(/orders-(\d{4}-\d{2}-\d{2})\.json$/)
          if (!m) return false
          return new Date(m[1]) < cutoff
        })
        .map(f => f.name)

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase.storage.from(BUCKET).remove(toDelete)
        if (deleteError) console.error('[backup] prune error:', deleteError)
      }
    }

    res.json({ ok: true, date, order_count: orderRows.length, file: `${BUCKET}/${filePath}` })
  } catch (err) {
    console.error('[backup] unexpected error:', err)
    res.status(500).json({ error: 'unexpected_error', message: String(err) })
  }
})

export default router
