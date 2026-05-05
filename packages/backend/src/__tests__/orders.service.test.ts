import { describe, it, expect } from 'vitest'
import { computeOrderLines, computeDailyNumber } from '../services/orders.service'
import type { MenuItem } from '../services/menuItems.service'

const fakeItems: Map<number, MenuItem> = new Map([
  [
    1,
    {
      id: 1,
      name: 'ברסקט עגל',
      category: 'תבשילים',
      unitLabel: '½ ק"ג',
      price: '55.00',
      active: true,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    2,
    {
      id: 2,
      name: 'פיתה',
      category: 'סלטים',
      unitLabel: null,
      price: '2.50',
      active: true,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    3,
    {
      id: 3,
      name: 'מוצר לא זמין',
      category: 'תבשילים',
      unitLabel: null,
      price: '100.00',
      active: false,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
])

describe('computeOrderLines', () => {
  it('snapshots name, category, unit_label, price from menu item', () => {
    const { lineInserts } = computeOrderLines(fakeItems, [{ menu_item_id: 1, quantity: 1 }])
    expect(lineInserts).toHaveLength(1)
    expect(lineInserts[0].itemNameSnap).toBe('ברסקט עגל')
    expect(lineInserts[0].categorySnap).toBe('תבשילים')
    expect(lineInserts[0].unitLabelSnap).toBe('½ ק"ג')
    expect(lineInserts[0].priceSnap).toBe('55.00')
  })

  it('unit_label_snap is null when item has no unit_label', () => {
    const { lineInserts } = computeOrderLines(fakeItems, [{ menu_item_id: 2, quantity: 1 }])
    expect(lineInserts[0].unitLabelSnap).toBeNull()
  })

  it('computes total_price correctly for multiple lines (2×55.00 + 3×2.50 = 117.50)', () => {
    const { totalPrice } = computeOrderLines(fakeItems, [
      { menu_item_id: 1, quantity: 2 },
      { menu_item_id: 2, quantity: 3 },
    ])
    expect(totalPrice).toBe(117.5)
  })

  it('snapshot is captured at call time (snapshot independent of subsequent change to map value)', () => {
    const mutableMap = new Map<number, MenuItem>([
      [
        1,
        {
          id: 1,
          name: 'שם מקורי',
          category: 'תבשילים',
          unitLabel: null,
          price: '50.00',
          active: true,
          displayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ])
    const { lineInserts } = computeOrderLines(mutableMap, [{ menu_item_id: 1, quantity: 1 }])
    // Mutate the map after the call
    const item = mutableMap.get(1)!
    ;(item as any).name = 'שם חדש'
    ;(item as any).price = '99.00'
    // Snapshot should still reflect the original values captured during the call
    expect(lineInserts[0].itemNameSnap).toBe('שם מקורי')
    expect(lineInserts[0].priceSnap).toBe('50.00')
  })

  it('throws on inactive menu item', () => {
    expect(() =>
      computeOrderLines(fakeItems, [{ menu_item_id: 3, quantity: 1 }])
    ).toThrow(/inactive/)
  })

  it('throws on missing menu item', () => {
    expect(() =>
      computeOrderLines(fakeItems, [{ menu_item_id: 999, quantity: 1 }])
    ).toThrow(/not found/)
  })
})

describe('computeDailyNumber', () => {
  it('computeDailyNumber(0) === 1', () => {
    expect(computeDailyNumber(0)).toBe(1)
  })

  it('computeDailyNumber(5) === 6', () => {
    expect(computeDailyNumber(5)).toBe(6)
  })

  it('increments from given max, not a global counter', () => {
    // Calling multiple times with independent values confirms no shared state
    expect(computeDailyNumber(10)).toBe(11)
    expect(computeDailyNumber(0)).toBe(1)
    expect(computeDailyNumber(3)).toBe(4)
  })
})
