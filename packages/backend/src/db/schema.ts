import {
  pgTable,
  serial,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const menuItems = pgTable(
  'menu_items',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    unitLabel: text('unit_label'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    active: boolean('active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idxCategory: index('idx_menu_items_category').on(table.category, table.displayOrder),
  })
)

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    dailyNumber: integer('daily_number').notNull(),
    orderDate: date('order_date').notNull(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    pickupTime: text('pickup_time'),
    status: text('status'),
    paymentMethod: text('payment_method'),
    paymentStatus: text('payment_status'),
    notes: text('notes'),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
    kitchenPrintedAt: timestamp('kitchen_printed_at', { withTimezone: true }),
    customerPrintedAt: timestamp('customer_printed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ordersDateNumberUnique: uniqueIndex('orders_date_number_unique').on(table.orderDate, table.dailyNumber),
    idxOrdersDate: index('idx_orders_date').on(table.orderDate),
    idxOrdersPhone: index('idx_orders_phone').on(table.customerPhone),
  })
)

export const orderLines = pgTable(
  'order_lines',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: integer('menu_item_id')
      .notNull()
      .references(() => menuItems.id),
    quantity: integer('quantity').notNull(),
    itemNameSnap: text('item_name_snap').notNull(),
    unitLabelSnap: text('unit_label_snap'),
    priceSnap: numeric('price_snap', { precision: 10, scale: 2 }).notNull(),
    categorySnap: text('category_snap').notNull(),
  },
  (table) => ({
    idxOrderLinesOrder: index('idx_order_lines_order').on(table.orderId),
    idxOrderLinesItem: index('idx_order_lines_item').on(table.menuItemId),
  })
)
