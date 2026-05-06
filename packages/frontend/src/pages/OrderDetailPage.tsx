import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency, formatDate } from '@natis/shared'
import type { ApiMenuItem, ApiOrderWithLines } from '@natis/shared'
import { ChevronRight, Pencil, X, Trash2, Printer } from 'lucide-react'
import { api } from '../api/client'

const CATEGORIES = ['עיקריות', 'תוספות', 'סלטים', 'חומוס'] as const

const PICKUP_TIMES: string[] = []
for (let h = 9; h <= 12; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 12 && m > 0) break
    PICKUP_TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [editMode, setEditMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0])

  // Header edit state
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editCustomerPhone, setEditCustomerPhone] = useState('')
  const [editPickupTime, setEditPickupTime] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editPayment, setEditPayment] = useState<'cash' | 'credit' | 'bit' | 'paybox' | 'check' | null>(null)

  // Lines edit cart
  const [cart, setCart] = useState<Record<number, number>>({})

  const { data: order, isLoading, isError } = useQuery<ApiOrderWithLines>({
    queryKey: ['order', id],
    queryFn: () => api.orders.get(parseInt(id!, 10)),
    retry: false,
  })

  const { data: menuItems = [] } = useQuery<ApiMenuItem[]>({
    queryKey: ['menu-items', 'active'],
    queryFn: () => api.menuItems.list(true),
    enabled: editMode,
  })

  useEffect(() => {
    if (editMode && order) {
      setEditCustomerName(order.customer_name)
      setEditCustomerPhone(order.customer_phone)
      setEditPickupTime(order.pickup_time ?? '')
      setEditStatus(order.status ?? '')
      setEditNotes(order.notes ?? '')
      setEditPayment(order.payment_method as 'cash' | 'credit' | 'bit' | 'paybox' | 'check' | null)
      const initialCart: Record<number, number> = {}
      for (const line of order.lines) {
        initialCart[line.menu_item_id] = line.quantity
      }
      setCart(initialCart)
    }
  }, [editMode, order])

  const menuItemsById = useMemo(
    () => new Map<number, ApiMenuItem>(menuItems.map((i) => [i.id, i])),
    [menuItems]
  )

  const categoryItems = useMemo(
    () => menuItems.filter((i) => i.category === activeCategory),
    [menuItems, activeCategory]
  )

  const cartEntries = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ item: menuItemsById.get(Number(itemId)), id: Number(itemId), qty })),
    [cart, menuItemsById]
  )

  const cartTotal = cartEntries.reduce(
    (s, { item, qty }) => (item ? s + item.price * qty : s),
    0
  )

  function addToCart(itemId: number) {
    setCart((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }))
  }

  function removeFromCart(itemId: number) {
    setCart((c) => {
      const next = { ...c }
      if ((next[itemId] ?? 0) <= 1) delete next[itemId]
      else next[itemId]--
      return next
    })
  }

  const patchMutation = useMutation({
    mutationFn: (data: object) => api.orders.patch(parseInt(id!, 10), data),
    onSuccess: (updated) => {
      qc.setQueryData(['order', id], updated)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const linesMutation = useMutation({
    mutationFn: (lines: { menu_item_id: number; quantity: number }[]) =>
      api.orders.replaceLines(parseInt(id!, 10), lines),
    onSuccess: (updated) => {
      qc.setQueryData(['order', id], updated)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.orders.delete(parseInt(id!, 10)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders/today', { state: { toast: 'הזמנה נמחקה' } })
    },
  })

  function handleSaveHeader() {
    patchMutation.reset()
    patchMutation.mutate({
      customer_name: editCustomerName,
      customer_phone: editCustomerPhone,
      pickup_time: editPickupTime || null,
      status: editStatus || null,
      notes: editNotes || null,
      payment_method: editPayment,
      payment_status: editPayment ? 'paid' : null,
    })
  }

  function handleSaveLines() {
    linesMutation.reset()
    const lines = cartEntries.map(({ id: itemId, qty }) => ({
      menu_item_id: itemId,
      quantity: qty,
    }))
    linesMutation.mutate(lines)
  }

  function exitEditMode() {
    setEditMode(false)
    patchMutation.reset()
    linesMutation.reset()
  }

  const showCustomerBanner =
    !!order?.customer_printed_at &&
    new Date(order.updated_at) > new Date(order.customer_printed_at)

  if (isLoading) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center text-gray-400">
        טוען הזמנה...
      </main>
    )
  }

  if (isError || !order) {
    return (
      <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <p>הזמנה לא נמצאה</p>
        <button
          onClick={() => navigate('/orders/today')}
          className="text-blue-600 hover:underline"
        >
          ← חזרה לרשימה
        </button>
      </main>
    )
  }

  const dateLabel = formatDate(new Date(order.order_date + 'T12:00:00'), {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })

  function fmtPrintTime(ts: string) {
    return new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => (editMode ? exitEditMode() : navigate('/orders/today'))}
          className="flex items-center gap-1 text-blue-600 text-sm hover:underline"
        >
          {editMode ? (
            <X size={16} />
          ) : (
            <ChevronRight size={16} className="rotate-180" />
          )}
          {editMode ? 'ביטול' : 'הזמנות'}
        </button>
        <h1 className="font-bold text-base">
          הזמנה #{order.daily_number}
        </h1>
        {editMode ? (
          <div className="w-16" />
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Pencil size={14} />
            ערוך
          </button>
        )}
      </header>

      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        {/* ── Edit-after-print banner ── */}
        {showCustomerBanner && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ ההזמנה עודכנה אחרי הדפסה — יש להדפיס מחדש את שובר הלקוח
            </p>
            <a
              href={`/print/order/${order.id}/customer`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              <Printer size={14} />
              הדפס שוב את שובר הלקוח
            </a>
          </div>
        )}

        {editMode ? (
          <>
            {/* ── Edit: header form ── */}
            <section className="bg-white rounded-2xl p-4 flex flex-col gap-3">
              <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                פרטי לקוח
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">שם לקוח</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">טלפון</label>
                  <input
                    type="tel"
                    dir="ltr"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-left"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">זמן איסוף</label>
                <select
                  dir="ltr"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-left"
                  value={editPickupTime}
                  onChange={(e) => setEditPickupTime(e.target.value)}
                >
                  <option value="">—</option>
                  {PICKUP_TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">סטטוס</label>
                <input
                  type="text"
                  list="status-suggestions"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  placeholder="מוכן, בהכנה, ..."
                />
                <datalist id="status-suggestions">
                  <option value="מוכן" />
                  <option value="בהכנה" />
                  <option value="הסתיים" />
                  <option value="טלפן ולא ענה" />
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">הערות</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="הערות להזמנה"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">תשלום</p>
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
                    <label key={label} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="edit-payment"
                        className="accent-blue-600"
                        checked={editPayment === val}
                        onChange={() => setEditPayment(val)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {patchMutation.isError && (
                <p className="text-red-600 text-sm">שגיאה בשמירת הפרטים. נסה שוב.</p>
              )}
              {patchMutation.isSuccess && (
                <p className="text-green-600 text-sm">✓ פרטים נשמרו</p>
              )}

              <button
                onClick={handleSaveHeader}
                disabled={
                  patchMutation.isPending ||
                  !editCustomerName.trim() ||
                  !editCustomerPhone.trim()
                }
                className="w-full py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {patchMutation.isPending ? 'שומר...' : 'שמור פרטים'}
              </button>
            </section>

            {/* ── Edit: lines ── */}
            <section className="bg-white rounded-2xl p-4 flex flex-col gap-3">
              <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">
                פריטים
              </h2>

              <div className="flex gap-2 border-b pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categoryItems.length === 0 && (
                  <p className="col-span-full text-gray-400 text-sm py-4 text-center">
                    אין פריטים בקטגוריה זו
                  </p>
                )}
                {categoryItems.map((item) => {
                  const qty = cart[item.id] ?? 0
                  return (
                    <div
                      key={item.id}
                      className="border rounded-xl p-3 flex flex-col gap-2 bg-gray-50 select-none"
                    >
                      <div className="text-sm font-medium leading-tight">
                        {item.name}
                        {item.unit_label && (
                          <span className="text-gray-500 text-xs me-1"> {item.unit_label}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500" dir="ltr">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-auto">
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-7 h-7 rounded-lg bg-blue-600 text-white text-base font-bold flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
                          >
                            +
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-base font-bold flex items-center justify-center active:scale-95 transition-all"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                            <button
                              onClick={() => addToCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-blue-600 text-white text-base font-bold flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {cartEntries.length > 0 && (
                <div className="border-t pt-3 flex flex-col gap-1">
                  {cartEntries.map(({ item, id: itemId, qty }) => (
                    <div key={itemId} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {qty}×{' '}
                        {item ? item.name : `פריט #${itemId}`}
                        {item?.unit_label && (
                          <span className="text-gray-400 text-xs"> {item.unit_label}</span>
                        )}
                      </span>
                      <span dir="ltr" className="text-gray-800">
                        {item ? formatCurrency(item.price * qty) : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                    <span>סה״כ</span>
                    <span dir="ltr">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              )}

              {linesMutation.isError && (
                <p className="text-red-600 text-sm">
                  שגיאה בשמירת הפריטים. בדוק שכל הפריטים פעילים.
                </p>
              )}
              {linesMutation.isSuccess && (
                <p className="text-green-600 text-sm">✓ פריטים נשמרו</p>
              )}

              <button
                onClick={handleSaveLines}
                disabled={linesMutation.isPending || cartEntries.length === 0}
                className="w-full py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {linesMutation.isPending ? 'שומר...' : 'שמור פריטים'}
              </button>
            </section>
          </>
        ) : (
          <>
            {/* ── View: order info ── */}
            <section className="bg-white rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">שם לקוח</div>
                  <div className="font-medium">{order.customer_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">טלפון</div>
                  <div dir="ltr" className="text-left font-medium">
                    {order.customer_phone}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">תאריך הזמנה</div>
                  <div>{dateLabel}</div>
                </div>
                {order.pickup_time && (
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">זמן איסוף</div>
                    <div dir="ltr" className="text-left">
                      {order.pickup_time}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">תשלום</div>
                  <div>
                    {order.payment_status === 'paid'
                      ? `שולם — ${{ cash: 'מזומן', credit: 'אשראי', bit: 'ביט', paybox: 'פייבוקס', check: "צ'ק" }[order.payment_method ?? ''] ?? order.payment_method}`
                      : 'טרם שולם'}
                  </div>
                </div>
                {order.status && (
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">סטטוס</div>
                    <div>{order.status}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">הדפסה</div>
                  <div>
                    {order.customer_printed_at ? 'הודפס' : 'לא הודפס'}
                  </div>
                </div>
                {order.notes && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-400 mb-0.5">הערות</div>
                    <div className="text-gray-700">{order.notes}</div>
                  </div>
                )}
              </div>
            </section>

            {/* ── View: line items ── */}
            <section className="bg-white rounded-2xl p-4">
              <h2 className="font-bold mb-3">פריטים</h2>
              <div className="flex flex-col gap-1.5 text-sm">
                {order.lines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-2">
                    <span className="text-gray-700">
                      {line.quantity}× {line.item_name_snap}
                      {line.unit_label_snap && (
                        <span className="text-gray-400 text-xs"> {line.unit_label_snap}</span>
                      )}
                    </span>
                    <span dir="ltr" className="text-gray-800 whitespace-nowrap">
                      {formatCurrency(line.price_snap * line.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>סה״כ</span>
                  <span dir="ltr">{formatCurrency(order.total_price)}</span>
                </div>
              </div>
            </section>

            {/* ── Print actions ── */}
            <section className="bg-white rounded-2xl p-4 flex flex-col gap-2">
              <h2 className="font-bold mb-1">הדפסה</h2>
              <a
                href={`/print/order/${order.id}/customer`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                <Printer size={15} />
                הדפס שובר לקוח
              </a>
              {order.customer_printed_at && (
                <p className="text-xs text-gray-400 pt-1">
                  הודפס לראשונה ב-{fmtPrintTime(order.customer_printed_at)}
                </p>
              )}
            </section>
          </>
        )}

        {/* ── Delete button (always visible) ── */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
        >
          <Trash2 size={16} />
          מחק הזמנה
        </button>
      </div>

      {/* ── Delete confirmation dialog ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleteMutation.isPending && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-lg mb-2">מחיקת הזמנה</h3>
            <p className="text-gray-600 mb-1">
              האם למחוק את הזמנה #{order.daily_number} של {order.customer_name}?
            </p>
            <p className="text-gray-500 text-sm mb-5">
              סה״כ:{' '}
              <span dir="ltr">{formatCurrency(order.total_price)}</span>
              {' '}· פעולה זו אינה הפיכה
            </p>
            {deleteMutation.isError && (
              <p className="text-red-600 text-sm mb-3">שגיאה במחיקה. נסה שוב.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {deleteMutation.isPending ? 'מוחק...' : 'מחק'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-40 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
