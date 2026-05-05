import { db } from '../db/client'
import { menuItems } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export type MenuItem = typeof menuItems.$inferSelect

export async function listMenuItems(active?: boolean): Promise<MenuItem[]> {
  const base = db.select().from(menuItems)
  if (active !== undefined) {
    return base.where(eq(menuItems.active, active)).orderBy(
      asc(menuItems.category),
      asc(menuItems.displayOrder),
      asc(menuItems.id)
    )
  }
  return base.orderBy(
    asc(menuItems.category),
    asc(menuItems.displayOrder),
    asc(menuItems.id)
  )
}

export async function getMenuItemById(id: number): Promise<MenuItem | undefined> {
  const rows = await db.select().from(menuItems).where(eq(menuItems.id, id))
  return rows[0]
}

export async function createMenuItem(data: {
  name: string
  category: string
  unitLabel?: string | null
  price: string
  displayOrder?: number
}): Promise<MenuItem> {
  const rows = await db
    .insert(menuItems)
    .values({
      name: data.name,
      category: data.category,
      unitLabel: data.unitLabel ?? null,
      price: data.price,
      displayOrder: data.displayOrder ?? 0,
    })
    .returning()
  return rows[0]
}

export async function updateMenuItem(
  id: number,
  data: Partial<{
    name: string
    category: string
    unitLabel: string | null
    price: string
    active: boolean
    displayOrder: number
  }>
): Promise<MenuItem | undefined> {
  const rows = await db
    .update(menuItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning()
  return rows[0]
}

export async function softDeleteMenuItem(id: number): Promise<MenuItem | undefined> {
  const rows = await db
    .update(menuItems)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning()
  return rows[0]
}
