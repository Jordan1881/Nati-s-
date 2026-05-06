import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency, formatDate } from '@natis/shared'
import type { ApiCustomerDetail, ApiRecentOrder } from '@natis/shared'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { api } from '../api/client'

function dateLabel(iso: string) {
  return formatDate(new Date(iso + 'T12:00:00'), { day: 'numeric', month: 'numeric', year: 'numeric' })
}

function paymentBadge(order: ApiRecentOrder) {
  if (order.payment_status === 'paid') {
    return (
      <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
        {order.payment_status === 'paid' ? 'שולם' : ''}
      </span>
    )
  }
  return <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">טרם שולם</span>
}

export default function CustomerDetailPage() {
  const { phone } = useParams<{ phone: string }>()
  const navigate = useNavigate()
  const decodedPhone = decodeURIComponent(phone ?? '')

  const { data: customer, isLoading, isError } = useQuery<ApiCustomerDetail>({
    queryKey: ['customer', decodedPhone],
    queryFn: () => api.customers.getByPhone(decodedPhone),
    retry: false,
  })

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/customers')}
          className="p-1.5 -ms-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="חזור"
        >
          <ArrowRight size={18} />
        </button>
        <h1 className="font-bold text-base flex-1 truncate">
          {customer?.customer_name ?? (isLoading ? 'טוען...' : 'לקוח לא נמצא')}
        </h1>
        {customer && (
          <span className="text-sm text-gray-500" dir="ltr">{customer.customer_phone}</span>
        )}
      </header>

      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
        {isLoading && <p className="text-center text-gray-400 py-12">טוען פרטי לקוח...</p>}

        {isError && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg">הלקוח לא נמצא</p>
          </div>
        )}

        {customer && (
          <>
            {/* Stats */}
            <section className="bg-white rounded-2xl p-5">
              <div className="flex flex-wrap gap-6">
                <div>
                  <div className="text-3xl font-black text-gray-900">{customer.order_count}</div>
                  <div className="text-sm text-gray-500 mt-1">הזמנות</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-gray-900" dir="ltr">
                    {formatCurrency(customer.total_spent)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">סה״כ</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                <span>לקוח מ-{dateLabel(customer.first_seen)}</span>
                <span>הזמנה אחרונה: {dateLabel(customer.last_seen)}</span>
              </div>
            </section>

            {/* Favorite items */}
            {customer.favorite_items.length > 0 && (
              <section className="bg-white rounded-2xl p-4">
                <h2 className="font-bold mb-3">פריטים מועדפים</h2>
                <div className="flex flex-col gap-2">
                  {customer.favorite_items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name}{item.unit_label ? ` ${item.unit_label}` : ''}
                      </span>
                      <span className="text-gray-500 font-medium">{item.quantity} יח׳</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent orders */}
            {customer.recent_orders.length > 0 && (
              <section className="bg-white rounded-2xl p-4">
                <h2 className="font-bold mb-3">הזמנות אחרונות</h2>
                <div className="flex flex-col gap-1">
                  {customer.recent_orders.map(order => (
                    <button
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-gray-50 rounded px-1 w-full text-start"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">
                          #{order.daily_number} — {dateLabel(order.order_date)}
                        </span>
                        {paymentBadge(order)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" dir="ltr">
                          {formatCurrency(order.total_price)}
                        </span>
                        <ChevronLeft size={14} className="text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
