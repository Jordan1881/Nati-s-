import 'dotenv/config'
import { db } from './client'
import { menuItems } from './schema'

// NATI's menu — בישול ביתי וחומוס, קיבוץ מחניים
// Each size variant is its own row per the architectural decision (Option A).
const menu = [
  // ─── תבשילים ─────────────────────────────────────────────────────────────
  { name: 'ברסקט עגל',    category: 'תבשילים', unitLabel: '½ ק״ג', price: '55.00',  displayOrder: 0 },
  { name: 'ברסקט עגל',    category: 'תבשילים', unitLabel: '1 ק״ג',  price: '110.00', displayOrder: 1 },
  { name: 'כתף כבש',      category: 'תבשילים', unitLabel: '½ ק״ג', price: '65.00',  displayOrder: 2 },
  { name: 'כתף כבש',      category: 'תבשילים', unitLabel: '1 ק״ג',  price: '130.00', displayOrder: 3 },
  { name: 'עוף שלם',      category: 'תבשילים', unitLabel: null,      price: '70.00',  displayOrder: 4 },
  { name: 'עוף חצי',      category: 'תבשילים', unitLabel: null,      price: '38.00',  displayOrder: 5 },
  { name: 'כרעיים',       category: 'תבשילים', unitLabel: 'ליח׳',   price: '22.00',  displayOrder: 6 },
  { name: 'שניצל עוף',    category: 'תבשילים', unitLabel: 'ליח׳',   price: '18.00',  displayOrder: 7 },
  { name: 'קציצות בשר',   category: 'תבשילים', unitLabel: '½ ק״ג', price: '42.00',  displayOrder: 8 },
  { name: 'קציצות בשר',   category: 'תבשילים', unitLabel: '1 ק״ג',  price: '80.00',  displayOrder: 9 },

  // ─── חומוס ───────────────────────────────────────────────────────────────
  { name: 'חומוס',         category: 'חומוס', unitLabel: 'מנה',      price: '25.00',  displayOrder: 0 },
  { name: 'חומוס',         category: 'חומוס', unitLabel: 'גדול',     price: '40.00',  displayOrder: 1 },
  { name: 'חומוס עם בשר',  category: 'חומוס', unitLabel: 'מנה',      price: '42.00',  displayOrder: 2 },
  { name: 'חומוס עם בשר',  category: 'חומוס', unitLabel: 'גדול',     price: '65.00',  displayOrder: 3 },
  { name: 'מסבחה',         category: 'חומוס', unitLabel: 'מנה',      price: '28.00',  displayOrder: 4 },
  { name: 'פול',           category: 'חומוס', unitLabel: 'מנה',      price: '22.00',  displayOrder: 5 },

  // ─── סלטים ───────────────────────────────────────────────────────────────
  { name: 'סלט ירוק',      category: 'סלטים', unitLabel: null,        price: '20.00',  displayOrder: 0 },
  { name: 'סלט מרוקאי',    category: 'סלטים', unitLabel: null,        price: '18.00',  displayOrder: 1 },
  { name: 'סלט חצילים',    category: 'סלטים', unitLabel: null,        price: '18.00',  displayOrder: 2 },
  { name: 'טחינה',         category: 'סלטים', unitLabel: null,        price: '12.00',  displayOrder: 3 },
  { name: 'ירקות חמוצים',  category: 'סלטים', unitLabel: null,        price: '14.00',  displayOrder: 4 },
] as const

async function seed() {
  console.log('Seeding NATI\'s menu...')
  await db.insert(menuItems).values(
    menu.map((item) => ({
      name: item.name,
      category: item.category,
      unitLabel: item.unitLabel ?? null,
      price: item.price,
      displayOrder: item.displayOrder,
      active: true,
    }))
  )
  console.log(`Inserted ${menu.length} menu items.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
