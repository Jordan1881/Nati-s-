import { z } from 'zod'

// ── Request schemas ──────────────────────────────────────────────────────────

export const orderLineInputSchema = z.object({
  menu_item_id: z.number().int().positive(),
  quantity: z.number().int().min(1),
})

export const createOrderSchema = z.object({
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  pickup_time: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  payment_method: z.enum(['cash', 'credit', 'bit', 'paybox', 'check']).nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid']).nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(orderLineInputSchema).min(1),
})

export const patchOrderSchema = z.object({
  customer_name: z.string().min(1).optional(),
  customer_phone: z.string().min(1).optional(),
  pickup_time: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  payment_method: z.enum(['cash', 'credit', 'bit', 'paybox', 'check']).nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid']).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const replaceLinesSchema = z.object({
  lines: z.array(orderLineInputSchema).min(1),
})

export const createMenuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unit_label: z.string().nullable().optional(),
  price: z.number().min(0),
  display_order: z.number().int().optional(),
})

export const patchMenuItemSchema = z
  .object({
    name: z.string().min(1),
    category: z.string().min(1),
    unit_label: z.string().nullable(),
    price: z.number().min(0),
    active: z.boolean(),
    display_order: z.number().int(),
  })
  .partial()

// ── API response types ───────────────────────────────────────────────────────

export interface ApiMenuItem {
  id: number
  name: string
  category: string
  unit_label: string | null
  price: number
  active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface ApiOrderLine {
  id: number
  menu_item_id: number
  quantity: number
  item_name_snap: string
  unit_label_snap: string | null
  price_snap: number
  category_snap: string
}

export interface ApiOrder {
  id: number
  daily_number: number
  order_date: string
  customer_name: string
  customer_phone: string
  pickup_time: string | null
  status: string | null
  payment_method: string | null
  payment_status: string | null
  notes: string | null
  total_price: number
  kitchen_printed_at: string | null
  customer_printed_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiOrderWithLines extends ApiOrder {
  lines: ApiOrderLine[]
}

export interface ApiOrderListItem extends ApiOrder {
  line_count: number
}

export interface ApiCustomerSummary {
  customer_phone: string
  customer_name: string
  order_count: number
  total_spent: number
  first_seen: string
  last_seen: string
}

export interface ApiFavoriteItem {
  name: string
  unit_label: string | null
  quantity: number
}

export interface ApiRecentOrder {
  id: number
  daily_number: number
  order_date: string
  total_price: number
  status: string | null
  payment_status: string | null
}

export interface ApiCustomerDetail extends ApiCustomerSummary {
  favorite_items: ApiFavoriteItem[]
  recent_orders: ApiRecentOrder[]
  is_hidden: boolean
}
