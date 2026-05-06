import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getActiveSaleDate, formatCurrency, formatDate } from '@natis/shared'
import type { ApiOrderListItem } from '@natis/shared'
import { Plus } from 'lucide-react'
import { api } from '../api/client'

function PaymentBadge({ method, status }: { method: string | null; status: string | null }) {
  if (status === 'paid') {
    const label = method === 'cash' ? 'מזומן' : method === 'credit' ? 'אשראי' : 'שולם'
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
        ✓ שולם ({label})
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      ⚠ טרם שולם
    </span>
  )
}

function PrintBadge({ kitchen, customer }: { kitchen: string | null; customer: string | null }) {
  if (kitchen && customer) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
        הודפס
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
      ⚠ לא הודפס
    </span>
  )
}

export default function OrdersListPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeSaleDateStr = getActiveSaleDate().toISOString().slice(0, 10)
  const [date, setDate] = useState(activeSaleDateStr)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'unprinted'>('all')
  const [toast, setToast] = useState<string | null>(null)

  // Show success toast from navigation state
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast
    if (msg) {
      setToast(msg)
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [location.state])

  const { data: orders = [], isLoading, refetch } = useQuery<ApiOrderListItem[]>({
    queryKey: ['orders', date],
    queryFn: () => api.orders.list({ date }),
  })

  // Refetch when tab regains focus
  useEffect(() => {
    function onFocus() { refetch() }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [refetch])

  const filteredOrders = useMemo(() => {
    if (filter === 'unpaid') return orders.filter((o) => o.payment_status !== 'paid')
    if (filter === 'unprinted') return orders.filter((o) => !o.kitchen_printed_at || !o.customer_printed_at)
    return orders
  }, [orders, filter])

  const unpaidCount = orders.filter((o) => o.payment_status !== 'paid').length
  const unprintedCount = orders.filter((o) => !o.kitchen_printed_at || !o.customer_printed_at).length

  const dateLabel = formatDate(new Date(date + 'T12:00:00'), {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="font-bold text-base">הזמנות ל{dateLabel}</h1>
        <input
          type="date"
          dir="ltr"
          className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </header>

      {/* Filter pills */}
      <div className="flex gap-2 px-4 pt-3 pb-0 flex-wrap">
        {(
          [
            ['all', 'הכל'],
            ['unpaid', `לא שולמו${unpaidCount ? ` (${unpaidCount})` : ''}`],
            ['unprinted', `לא הודפסו${unprintedCount ? ` (${unprintedCount})` : ''}`],
          ] as const
        ).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === val
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 bg-green-700 text-white px-5 py-2 rounded-full text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4">
        {isLoading && (
          <p className="text-center text-gray-400 py-12">טוען הזמנות...</p>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
            <p className="text-lg">אין הזמנות ליום זה</p>
            <button
              onClick={() => navigate('/orders/new')}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              הזמנה חדשה
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filteredOrders.map(order => (
            <button
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="bg-white rounded-xl border p-4 text-start hover:border-blue-400 hover:shadow-sm transition-all w-full"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">#{order.daily_number}</span>
                  {order.pickup_time && (
                    <span className="text-sm text-gray-500" dir="ltr">{order.pickup_time}</span>
                  )}
                  <span className="font-medium">{order.customer_name}</span>
                </div>
                <span className="font-semibold" dir="ltr">
                  {formatCurrency(order.total_price)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400" dir="ltr">{order.customer_phone}</span>
                <span className="text-xs text-gray-400">{order.line_count} פריטים</span>
                <PaymentBadge method={order.payment_method} status={order.payment_status} />
                <PrintBadge kitchen={order.kitchen_printed_at} customer={order.customer_printed_at} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FAB: new order */}
      <button
        onClick={() => navigate('/orders/new')}
        className="fixed bottom-6 start-6 z-20 bg-blue-600 text-white rounded-full h-14 w-14 shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors text-2xl"
        aria-label="הזמנה חדשה"
      >
        <Plus size={24} />
      </button>
    </main>
  )
}
