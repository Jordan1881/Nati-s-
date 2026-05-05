import { Router } from 'express'
import { z } from 'zod'
import * as svc from '../services/menuItems.service.js'
import type { MenuItem } from '../services/menuItems.service.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unit_label: z.string().nullable().optional(),
  price: z.number().min(0),
  display_order: z.number().int().optional(),
})

const patchSchema = z
  .object({
    name: z.string().min(1),
    category: z.string().min(1),
    unit_label: z.string().nullable(),
    price: z.number().min(0),
    active: z.boolean(),
    display_order: z.number().int(),
  })
  .partial()

function serialize(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit_label: item.unitLabel ?? null,
    price: parseFloat(item.price as string),
    active: item.active,
    display_order: item.displayOrder,
    created_at: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updated_at: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
  }
}

router.get('/', async (req, res) => {
  const activeParam = req.query.active
  let active: boolean | undefined
  if (activeParam === 'true') active = true
  else if (activeParam === 'false') active = false
  const items = await svc.listMenuItems(active)
  res.json(items.map(serialize))
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }
  const item = await svc.getMenuItemById(id)
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(serialize(item))
})

router.post('/', async (req, res) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.flatten() })
    return
  }
  const { unit_label, display_order, price, ...rest } = result.data
  const item = await svc.createMenuItem({
    ...rest,
    unitLabel: unit_label ?? null,
    displayOrder: display_order ?? 0,
    price: String(price),
  })
  res.status(201).json(serialize(item))
})

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }
  const result = patchSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.flatten() })
    return
  }
  const updates: Parameters<typeof svc.updateMenuItem>[1] = {}
  const d = result.data
  if (d.name !== undefined) updates.name = d.name
  if (d.category !== undefined) updates.category = d.category
  if ('unit_label' in d) updates.unitLabel = d.unit_label ?? null
  if (d.price !== undefined) updates.price = String(d.price)
  if (d.active !== undefined) updates.active = d.active
  if (d.display_order !== undefined) updates.displayOrder = d.display_order
  const item = await svc.updateMenuItem(id, updates)
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.json(serialize(item))
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }
  const item = await svc.softDeleteMenuItem(id)
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  res.sendStatus(204)
})

export default router
