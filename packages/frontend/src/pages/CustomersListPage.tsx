import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatDate } from '@natis/shared'
import type { ApiCustomerSummary } from '@natis/shared'
import { Search, Plus } from 'lucide-react'
import { api } from '../api/client'

export default function CustomersListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'orders' | 'spent'>('orders')

  const { data: customers = [], isLoading } = useQuery<ApiCustomerSummary[]>({
    queryKey: ['customers', search, sort],
    queryFn: () => api.customers.list({ search: search || undefined, sort }),
    placeholderData: prev => prev,
  })

  return (
    <main dir="rtl" className="min-h-screen bg-[#FDFAF6]">
      <header className="bg-white/95 backdrop-blur-sm border-b border-[#F0E4D0] px-4 py-3 flex items-center gap-3">
        <h1 className="font-bold text-base flex-1">לקוחות</h1>
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="חיפוש לפי שם או טלפון"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-[#E8D8C4] rounded-xl ps-8 pe-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-colors"
          />
        </div>
      </header>

      {/* Sort pills */}
      <div className="bg-white/95 border-b border-[#F0E4D0] px-4 py-2 flex gap-2">
        {(['orders', 'spent'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sort === s
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-white border border-[#F0E4D0] text-gray-600 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {s === 'orders' ? 'לפי הזמנות' : 'לפי סכום'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {isLoading && <p className="text-center text-gray-400 py-12">טוען לקוחות...</p>}

        {!isLoading && customers.length === 0 && (
          <p className="text-center text-gray-400 py-12">לא נמצאו לקוחות</p>
        )}

        <div className="flex flex-col gap-2">
          {customers.map(c => (
            <button
              key={c.customer_phone}
              onClick={() => navigate(`/customers/${encodeURIComponent(c.customer_phone)}`)}
              className="bg-white rounded-xl p-4 text-start border border-[#F0E4D0] shadow-sm hover:shadow-md hover:border-brand-300 transition-all w-full"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{c.customer_name}</div>
                  <div className="text-sm text-gray-500 mt-0.5" dir="ltr">{c.customer_phone}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className="font-bold text-gray-900" dir="ltr">{formatCurrency(c.total_spent)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.order_count} {c.order_count === 1 ? 'הזמנה' : 'הזמנות'}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                לקוח מ-{formatDate(new Date(c.first_seen + 'T12:00:00'), { day: 'numeric', month: 'numeric', year: 'numeric' })}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate('/orders/new')}
        className="fixed bottom-6 start-6 z-20 bg-brand-500 text-white rounded-full h-14 w-14 shadow-lg flex items-center justify-center hover:bg-brand-600 transition-colors"
        aria-label="הזמנה חדשה"
      >
        <Plus size={24} />
      </button>
    </main>
  )
}
