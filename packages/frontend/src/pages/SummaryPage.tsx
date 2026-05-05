import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getActiveSaleDate, formatCurrency, formatDate } from '@natis/shared'
import { Plus, Printer, Download, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PaymentGroup {
  count: number
  total: number
}
interface UnpaidOrder {
  id: number
  daily_number: number
}
interface UnpaidGroup {
  count: number
  total: number
  orders: UnpaidOrder[]
}
interface ItemSold {
  menu_item_id: number
  name: string
  unit_label: string | null
  category: string
  quantity: number
  revenue: number
}
interface ItemRolledUp {
  name: string
  category: string
  total_quantity: number
  revenue: number
}
interface Summary {
  date: string
  order_count: number
  total_revenue: number
  payment_breakdown: {
    cash: PaymentGroup
    credit: PaymentGroup
    unpaid: UnpaidGroup
  }
  items_sold: ItemSold[]
  items_rolled_up: ItemRolledUp[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['תבשילים', 'חומוס', 'סלטים']

function sortCats(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a)
    const bi = CATEGORY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b, 'he')
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

async function fetchSummary(date: string): Promise<Summary> {
  const res = await fetch(`/api/summary/${date}`)
  if (!res.ok) throw new Error('Failed to fetch summary')
  return res.json()
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const navigate = useNavigate()
  const activeSaleDateStr = getActiveSaleDate().toISOString().slice(0, 10)
  const [date, setDate] = useState(activeSaleDateStr)
  const [showSizeBreakdown, setShowSizeBreakdown] = useState(false)

  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ['summary', date],
    queryFn: () => fetchSummary(date),
  })

  const dateLabel = formatDate(new Date(date + 'T12:00:00'), {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })

  // Build per-category item rows for the table
  const itemsByCategory = useMemo(() => {
    if (!summary) return []

    type Row = { name: string; category: string; quantity: number; revenue: number }
    const rows: Row[] = showSizeBreakdown
      ? summary.items_sold.map(i => ({
          name: i.unit_label ? `${i.name} ${i.unit_label}` : i.name,
          category: i.category,
          quantity: i.quantity,
          revenue: i.revenue,
        }))
      : summary.items_rolled_up.map(i => ({
          name: i.name,
          category: i.category,
          quantity: i.total_quantity,
          revenue: i.revenue,
        }))

    const groups = new Map<string, Row[]>()
    for (const row of rows) {
      if (!groups.has(row.category)) groups.set(row.category, [])
      groups.get(row.category)!.push(row)
    }

    return sortCats([...groups.keys()]).map(cat => ({
      category: cat,
      items: (groups.get(cat) ?? []).sort((a, b) => b.revenue - a.revenue),
    }))
  }, [summary, showSizeBreakdown])

  function handleExportJson() {
    fetch(`/api/orders?date=${date}`)
      .then(r => r.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `natis-orders-${date}.json`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  const unpaid = summary?.payment_breakdown.unpaid

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="font-bold text-base">סיכום יומי · {dateLabel}</h1>
        <input
          type="date"
          dir="ltr"
          className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </header>

      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
        {isLoading && (
          <p className="text-center text-gray-400 py-12">טוען סיכום...</p>
        )}

        {!isLoading && summary?.order_count === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
            <p className="text-lg">אין הזמנות ליום זה</p>
          </div>
        )}

        {summary && summary.order_count > 0 && (
          <>
            {/* ── Headline numbers ── */}
            <section className="bg-white rounded-2xl p-5">
              <div className="flex flex-wrap gap-6">
                <div>
                  <div className="text-4xl font-black text-gray-900">{summary.order_count}</div>
                  <div className="text-sm text-gray-500 mt-1">הזמנות</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-gray-900" dir="ltr">
                    {formatCurrency(summary.total_revenue)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">סה״כ</div>
                </div>
                {unpaid && unpaid.count > 0 && (
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {unpaid.count} {unpaid.count === 1 ? 'הזמנה לא שולמה' : 'הזמנות לא שולמו'} —{' '}
                      <span dir="ltr">{formatCurrency(unpaid.total)}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">לא שולם</div>
                  </div>
                )}
              </div>
            </section>

            {/* ── Payment breakdown ── */}
            <section className="bg-white rounded-2xl p-4">
              <h2 className="font-bold mb-3">פירוט תשלומים</h2>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: 'מזומן', data: summary.payment_breakdown.cash },
                    { label: 'אשראי', data: summary.payment_breakdown.credit },
                  ].map(({ label, data }) => (
                    <tr key={label} className="border-b last:border-0">
                      <td className="py-2 text-gray-600 w-24">{label}</td>
                      <td className="py-2 text-gray-500 w-32">
                        {data.count} {data.count === 1 ? 'הזמנה' : 'הזמנות'}
                      </td>
                      <td className="py-2 font-medium text-end" dir="ltr">
                        {formatCurrency(data.total)}
                      </td>
                    </tr>
                  ))}
                  {unpaid && unpaid.count > 0 && (
                    <tr className="border-t-2">
                      <td className="py-2 text-amber-600 font-semibold">טרם שולם</td>
                      <td className="py-2 text-gray-500">
                        {unpaid.count} {unpaid.count === 1 ? 'הזמנה' : 'הזמנות'}
                      </td>
                      <td className="py-2 font-semibold text-amber-600 text-end" dir="ltr">
                        {formatCurrency(unpaid.total)}
                      </td>
                      <td className="py-2 ps-3">
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {unpaid.orders.map(o => (
                            <button
                              key={o.id}
                              onClick={() => navigate(`/orders/${o.id}`)}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              ← #{o.daily_number}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* ── Items sold ── */}
            <section className="bg-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">פריטים שנמכרו</h2>
                <button
                  onClick={() => setShowSizeBreakdown(v => !v)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  {showSizeBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showSizeBreakdown ? 'הסתר פירוט גדלים' : 'הצג פירוט גדלים'}
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {itemsByCategory.map(({ category, items }) => (
                  <div key={category}>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      {category}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b">
                          <th className="pb-1 text-start font-normal">פריט</th>
                          <th className="pb-1 text-center font-normal w-16">כמות</th>
                          <th className="pb-1 text-end font-normal w-28">הכנסה</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 text-gray-700">{item.name}</td>
                            <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                            <td className="py-1.5 text-end font-medium" dir="ltr">
                              {formatCurrency(item.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Actions ── */}
            <section className="flex flex-col gap-2">
              <a
                href={`/print/bonim/${date}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              >
                <Printer size={18} />
                הדפס קובץ בונים של היום
              </a>
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                <Download size={16} />
                יצוא JSON
              </button>
            </section>
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/orders/new')}
        className="fixed bottom-6 start-6 z-20 bg-blue-600 text-white rounded-full h-14 w-14 shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        aria-label="הזמנה חדשה"
      >
        <Plus size={24} />
      </button>
    </main>
  )
}
