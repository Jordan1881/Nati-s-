import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActiveSaleDate, formatCurrency } from '@natis/shared'
import type { ApiMenuItem, ApiOrderListItem } from '@natis/shared'
import { ShoppingCart, X } from 'lucide-react'
import { api } from '../api/client'

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['עיקריות', 'תוספות', 'סלטים', 'חומוס'] as const

const PICKUP_TIMES: string[] = []
for (let h = 9; h <= 12; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 12 && m > 0) break
    PICKUP_TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useMenuItems() {
  return useQuery<ApiMenuItem[]>({
    queryKey: ['menu-items', 'active'],
    queryFn: () => api.menuItems.list(true),
  })
}

function useCustomerLookup(phone: string) {
  const [debounced, setDebounced] = useState(phone)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(phone), 300)
    return () => clearTimeout(t)
  }, [phone])

  const digits = debounced.replace(/\D/g, '')
  return useQuery<ApiOrderListItem[]>({
    queryKey: ['customer-lookup', debounced],
    queryFn: () => api.orders.list({ phone: debounced }),
    enabled: digits.length >= 7,
    staleTime: 30_000,
  })
}

// ── Item card ──────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  qty,
  onAdd,
  onRemove,
}: {
  item: ApiMenuItem
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={`rounded-xl p-3 flex flex-col gap-2 select-none transition-all ${
        qty > 0
          ? 'bg-brand-50 border border-brand-300 shadow-sm'
          : 'bg-white border border-[#F0E4D0] hover:border-brand-200 hover:shadow-sm'
      }`}
    >
      <div className="text-sm font-medium leading-tight">
        {item.name}
        {item.unit_label && (
          <span className="text-gray-400 text-xs me-1"> {item.unit_label}</span>
        )}
      </div>
      <div className="text-sm text-gray-500" dir="ltr">
        {formatCurrency(item.price)}
      </div>
      <div className="flex items-center justify-end gap-1 mt-auto">
        {qty === 0 ? (
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-lg bg-brand-500 text-white text-lg font-bold flex items-center justify-center hover:bg-brand-600 active:scale-95 transition-all"
          >
            +
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onRemove}
              className="w-8 h-8 rounded-lg bg-white border border-[#E8D8C4] hover:bg-gray-100 text-lg font-bold flex items-center justify-center active:scale-95 transition-all"
            >
              −
            </button>
            <span className="w-6 text-center font-bold text-sm text-brand-700">{qty}</span>
            <button
              onClick={onAdd}
              className="w-8 h-8 rounded-lg bg-brand-500 text-white text-lg font-bold flex items-center justify-center hover:bg-brand-600 active:scale-95 transition-all"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cart panel ─────────────────────────────────────────────────────────────────

function CartPanel({
  cart,
  menuItemsById,
  notes,
  paymentOption,
  onNotesChange,
  onPaymentChange,
  onSave,
  onSaveAndPrint,
  saving,
}: {
  cart: Record<number, number>
  menuItemsById: Map<number, ApiMenuItem>
  notes: string
  paymentOption: 'cash' | 'credit' | 'bit' | 'paybox' | 'check' | null
  onNotesChange: (v: string) => void
  onPaymentChange: (v: 'cash' | 'credit' | 'bit' | 'paybox' | 'check' | null) => void
  onSave: () => void
  onSaveAndPrint: () => void
  saving: boolean
}) {
  const cartEntries = Object.entries(cart)
    .map(([id, qty]) => ({ item: menuItemsById.get(Number(id))!, qty }))
    .filter(e => e.item)

  const total = cartEntries.reduce((s, { item, qty }) => s + item.price * qty, 0)
  const itemCount = cartEntries.reduce((s, { qty }) => s + qty, 0)
  const canSubmit = cartEntries.length > 0

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-base text-gray-800">
        הזמנה{itemCount > 0 && ` (${itemCount} פריטים)`}
      </h2>

      {cartEntries.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">הוסף פריטים מהתפריט</p>
      ) : (
        <div className="flex flex-col gap-1.5 text-sm">
          {cartEntries.map(({ item, qty }) => (
            <div key={item.id} className="flex justify-between gap-2">
              <span className="text-gray-700">
                {qty}× {item.name}
                {item.unit_label && <span className="text-gray-400 text-xs"> {item.unit_label}</span>}
              </span>
              <span className="whitespace-nowrap font-medium text-gray-800" dir="ltr">
                {formatCurrency(item.price * qty)}
              </span>
            </div>
          ))}
        </div>
      )}

      <hr className="border-[#F0E4D0]" />

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">הערות</label>
        <textarea
          className="w-full border border-[#E8D8C4] rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-colors"
          rows={2}
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="הערות להזמנה (אופציונלי)"
        />
      </div>

      <div>
        <p className="text-sm font-medium mb-2 text-gray-700">תשלום</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {(
            [
              ['cash', 'מזומן'],
              ['credit', 'אשראי'],
              ['bit', 'ביט'],
              ['paybox', 'פייבוקס'],
              ['check', "צ'ק"],
              [null, 'טרם'],
            ] as const
          ).map(([val, label]) => (
            <label key={label} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="payment"
                className="accent-brand-500"
                checked={paymentOption === val}
                onChange={() => onPaymentChange(val)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <hr className="border-[#F0E4D0]" />

      <div className="flex justify-between items-center font-black text-xl text-gray-900">
        <span>סה״כ</span>
        <span dir="ltr">{formatCurrency(total)}</span>
      </div>

      <button
        onClick={onSaveAndPrint}
        disabled={!canSubmit || saving}
        className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        שמור והדפס שובר
      </button>
      <button
        onClick={onSave}
        disabled={!canSubmit || saving}
        className="w-full py-2.5 rounded-xl border-2 border-brand-500 text-brand-600 font-bold hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        שמור
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OrderEntryPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const activeSaleDateStr = useMemo(
    () => getActiveSaleDate().toISOString().slice(0, 10),
    []
  )

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [orderDate, setOrderDate] = useState(activeSaleDateStr)
  const [pickupTime, setPickupTime] = useState('09:30')
  const [notes, setNotes] = useState('')
  const [paymentOption, setPaymentOption] = useState<'cash' | 'credit' | 'bit' | 'paybox' | 'check' | null>(null)
  const [cart, setCart] = useState<Record<number, number>>({})
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0])
  const [cartOpen, setCartOpen] = useState(false)

  const { data: menuItems = [] } = useMenuItems()
  const { data: customerOrders = [] } = useCustomerLookup(phone)

  const menuItemsById = useMemo(
    () => new Map(menuItems.map(i => [i.id, i])),
    [menuItems]
  )

  const returningCustomer = useMemo(() => {
    if (!customerOrders.length) return null
    return {
      name: customerOrders[0].customer_name,
      count: customerOrders.length,
    }
  }, [customerOrders])

  const categoryItems = useMemo(
    () => menuItems.filter(i => i.category === activeCategory),
    [menuItems, activeCategory]
  )

  const cartItemCount = Object.values(cart).reduce((s, q) => s + q, 0)

  function addToCart(id: number) {
    setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
  }

  function removeFromCart(id: number) {
    setCart(c => {
      const next = { ...c }
      if ((next[id] ?? 0) <= 1) delete next[id]
      else next[id]--
      return next
    })
  }

  const canSubmit =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    Object.keys(cart).length > 0

  const createOrder = useMutation({
    mutationFn: (data: object) => api.orders.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  function buildPayload() {
    return {
      order_date: orderDate,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      pickup_time: pickupTime || null,
      notes: notes.trim() || null,
      payment_method: paymentOption,
      payment_status: paymentOption ? 'paid' : null,
      lines: Object.entries(cart).map(([id, qty]) => ({
        menu_item_id: Number(id),
        quantity: qty,
      })),
    }
  }

  function handleSave() {
    if (!canSubmit) return
    createOrder.mutate(buildPayload(), {
      onSuccess: order => {
        navigate('/orders/today', {
          state: { toast: `הזמנה #${order.daily_number} נשמרה` },
        })
      },
    })
  }

  function handleSaveAndPrint() {
    if (!canSubmit) return
    createOrder.mutate(buildPayload(), {
      onSuccess: order => {
        window.open(`/print/order/${order.id}/customer`, '_blank')
        navigate('/orders/today', {
          state: { toast: `הזמנה #${order.daily_number} נשמרה` },
        })
      },
    })
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FDFAF6]">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-[#F0E4D0] sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/orders/today')}
          className="text-brand-600 text-sm hover:text-brand-700 font-medium"
        >
          ← הזמנות
        </button>
        <h1 className="font-bold">הזמנה חדשה</h1>
        <div className="w-16" />
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:flex lg:gap-6">
        {/* ── Start column: form + menu ── */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Customer info */}
          <section className="bg-white rounded-2xl p-4 flex flex-col gap-3 border border-[#F0E4D0] shadow-md">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">פרטי לקוח</h2>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">טלפון</label>
              <input
                type="tel"
                inputMode="tel"
                dir="ltr"
                className="w-full border border-[#E8D8C4] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 text-left transition-colors"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="050-1234567"
              />
            </div>

            {/* Returning customer banner */}
            {returningCustomer && (
              <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-3 py-2.5 text-sm">
                <span className="text-brand-800 font-medium">
                  לקוח חוזר: {returningCustomer.name} · {returningCustomer.count} הזמנות
                </span>
                <button
                  onClick={() => setName(returningCustomer.name)}
                  className="text-brand-600 font-bold hover:text-brand-700 whitespace-nowrap me-2"
                >
                  השתמש בפרטים
                </button>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">שם לקוח</label>
              <input
                type="text"
                className="w-full border border-[#E8D8C4] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-colors"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="שם מלא"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Pickup time */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">זמן איסוף</label>
                <select
                  dir="ltr"
                  className="w-full border border-[#E8D8C4] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 text-left transition-colors"
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                >
                  {PICKUP_TIMES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Order date */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">תאריך הזמנה</label>
                <input
                  type="date"
                  dir="ltr"
                  className="w-full border border-[#E8D8C4] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 text-left transition-colors"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Menu */}
          <section className="bg-white rounded-2xl p-4 flex flex-col gap-3 border border-[#F0E4D0] shadow-md">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">תפריט</h2>

            {/* Category tabs */}
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-white border border-[#F0E4D0] text-gray-600 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Item grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryItems.length === 0 && (
                <p className="col-span-full text-gray-400 text-sm py-4 text-center">
                  אין פריטים בקטגוריה זו
                </p>
              )}
              {categoryItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  qty={cart[item.id] ?? 0}
                  onAdd={() => addToCart(item.id)}
                  onRemove={() => removeFromCart(item.id)}
                />
              ))}
            </div>
          </section>

          {/* Submit error */}
          {createOrder.isError && (
            <p className="text-red-600 text-sm text-center">
              שגיאה בשמירת ההזמנה. נסה שוב.
            </p>
          )}
        </div>

        {/* ── End column: cart panel (desktop) ── */}
        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-[72px] bg-white rounded-2xl p-4 shadow-md border border-[#F0E4D0]">
            <CartPanel
              cart={cart}
              menuItemsById={menuItemsById}
              notes={notes}
              paymentOption={paymentOption}
              onNotesChange={setNotes}
              onPaymentChange={setPaymentOption}
              onSave={handleSave}
              onSaveAndPrint={handleSaveAndPrint}
              saving={createOrder.isPending}
            />
          </div>
        </aside>
      </div>

      {/* ── Mobile: floating cart button + drawer ── */}
      <div className="lg:hidden">
        {/* FAB */}
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 start-6 z-20 bg-brand-500 text-white rounded-full h-14 px-5 shadow-lg flex items-center gap-2 font-semibold hover:bg-brand-600 transition-colors"
        >
          <ShoppingCart size={20} />
          {cartItemCount > 0 && (
            <span className="bg-white text-brand-600 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
              {cartItemCount}
            </span>
          )}
          סל
        </button>

        {/* Cart drawer */}
        {cartOpen && (
          <div className="fixed inset-0 z-30 flex flex-col justify-end" dir="rtl">
            <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
            <div className="relative bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto border-t border-[#F0E4D0]">
              <button
                onClick={() => setCartOpen(false)}
                className="absolute top-4 start-4 text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
              <CartPanel
                cart={cart}
                menuItemsById={menuItemsById}
                notes={notes}
                paymentOption={paymentOption}
                onNotesChange={setNotes}
                onPaymentChange={setPaymentOption}
                onSave={() => { setCartOpen(false); handleSave() }}
                onSaveAndPrint={() => { setCartOpen(false); handleSaveAndPrint() }}
                saving={createOrder.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
