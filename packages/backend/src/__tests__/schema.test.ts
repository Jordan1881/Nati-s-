import { describe, it, expect } from 'vitest'
import { menuItems, orders, orderLines } from '../db/schema'
import { getTableColumns } from 'drizzle-orm'

describe('menuItems schema', () => {
  it('has all required columns', () => {
    const cols = getTableColumns(menuItems)
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('name')
    expect(cols).toHaveProperty('category')
    expect(cols).toHaveProperty('unitLabel')
    expect(cols).toHaveProperty('price')
    expect(cols).toHaveProperty('active')
    expect(cols).toHaveProperty('displayOrder')
    expect(cols).toHaveProperty('createdAt')
    expect(cols).toHaveProperty('updatedAt')
  })

  it('maps to the correct SQL column names', () => {
    const cols = getTableColumns(menuItems)
    expect(cols.unitLabel.name).toBe('unit_label')
    expect(cols.displayOrder.name).toBe('display_order')
    expect(cols.createdAt.name).toBe('created_at')
    expect(cols.updatedAt.name).toBe('updated_at')
  })

  it('active defaults to true', () => {
    const cols = getTableColumns(menuItems)
    expect(cols.active.default).toBe(true)
  })
})

describe('orders schema', () => {
  it('has all required columns', () => {
    const cols = getTableColumns(orders)
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('dailyNumber')
    expect(cols).toHaveProperty('orderDate')
    expect(cols).toHaveProperty('customerName')
    expect(cols).toHaveProperty('customerPhone')
    expect(cols).toHaveProperty('pickupTime')
    expect(cols).toHaveProperty('status')
    expect(cols).toHaveProperty('paymentMethod')
    expect(cols).toHaveProperty('paymentStatus')
    expect(cols).toHaveProperty('notes')
    expect(cols).toHaveProperty('totalPrice')
    expect(cols).toHaveProperty('kitchenPrintedAt')
    expect(cols).toHaveProperty('customerPrintedAt')
    expect(cols).toHaveProperty('createdAt')
    expect(cols).toHaveProperty('updatedAt')
  })

  it('maps payment columns to correct SQL names', () => {
    const cols = getTableColumns(orders)
    expect(cols.paymentMethod.name).toBe('payment_method')
    expect(cols.paymentStatus.name).toBe('payment_status')
    expect(cols.dailyNumber.name).toBe('daily_number')
    expect(cols.orderDate.name).toBe('order_date')
    expect(cols.kitchenPrintedAt.name).toBe('kitchen_printed_at')
    expect(cols.customerPrintedAt.name).toBe('customer_printed_at')
  })

  it('nullable columns are nullable', () => {
    const cols = getTableColumns(orders)
    // These must be nullable — operator may leave them unset
    expect(cols.pickupTime.notNull).toBeFalsy()
    expect(cols.status.notNull).toBeFalsy()
    expect(cols.paymentMethod.notNull).toBeFalsy()
    expect(cols.paymentStatus.notNull).toBeFalsy()
    expect(cols.notes.notNull).toBeFalsy()
    expect(cols.kitchenPrintedAt.notNull).toBeFalsy()
    expect(cols.customerPrintedAt.notNull).toBeFalsy()
  })
})

describe('orderLines schema', () => {
  it('has all snapshot fields', () => {
    const cols = getTableColumns(orderLines)
    expect(cols).toHaveProperty('itemNameSnap')
    expect(cols).toHaveProperty('unitLabelSnap')
    expect(cols).toHaveProperty('priceSnap')
    expect(cols).toHaveProperty('categorySnap')
  })

  it('maps snapshot fields to correct SQL names', () => {
    const cols = getTableColumns(orderLines)
    expect(cols.itemNameSnap.name).toBe('item_name_snap')
    expect(cols.unitLabelSnap.name).toBe('unit_label_snap')
    expect(cols.priceSnap.name).toBe('price_snap')
    expect(cols.categorySnap.name).toBe('category_snap')
  })

  it('unitLabelSnap is nullable', () => {
    const cols = getTableColumns(orderLines)
    expect(cols.unitLabelSnap.notNull).toBeFalsy()
  })

  it('has orderId and menuItemId FK columns', () => {
    const cols = getTableColumns(orderLines)
    expect(cols.orderId.name).toBe('order_id')
    expect(cols.menuItemId.name).toBe('menu_item_id')
  })
})
