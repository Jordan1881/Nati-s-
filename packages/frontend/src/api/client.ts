import type {
  ApiMenuItem,
  ApiOrderListItem,
  ApiOrderWithLines,
  ApiCustomerSummary,
  ApiCustomerDetail,
} from '@natis/shared'

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  orders: {
    list(params?: { date?: string; from?: string; to?: string; phone?: string }) {
      const qs = new URLSearchParams()
      if (params?.date) qs.set('date', params.date)
      if (params?.from) qs.set('from', params.from)
      if (params?.to) qs.set('to', params.to)
      if (params?.phone) qs.set('phone', params.phone)
      const query = qs.toString()
      return apiFetch<ApiOrderListItem[]>(`/api/orders${query ? `?${query}` : ''}`)
    },
    get(id: number) {
      return apiFetch<ApiOrderWithLines>(`/api/orders/${id}`)
    },
    create(data: object) {
      return apiFetch<ApiOrderWithLines>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    patch(id: number, data: object) {
      return apiFetch<ApiOrderWithLines>(`/api/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    replaceLines(id: number, lines: { menu_item_id: number; quantity: number }[]) {
      return apiFetch<ApiOrderWithLines>(`/api/orders/${id}/lines`, {
        method: 'PUT',
        body: JSON.stringify({ lines }),
      })
    },
    delete(id: number) {
      return apiFetch<void>(`/api/orders/${id}`, { method: 'DELETE' })
    },
  },
  menuItems: {
    list(active?: boolean) {
      const query = active !== undefined ? `?active=${active}` : ''
      return apiFetch<ApiMenuItem[]>(`/api/menu-items${query}`)
    },
    create(data: object) {
      return apiFetch<ApiMenuItem>('/api/menu-items', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    patch(id: number, data: object) {
      return apiFetch<ApiMenuItem>(`/api/menu-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    delete(id: number) {
      return apiFetch<void>(`/api/menu-items/${id}`, { method: 'DELETE' })
    },
  },
  customers: {
    list(params?: { search?: string; sort?: string; limit?: number }) {
      const qs = new URLSearchParams()
      if (params?.search) qs.set('search', params.search)
      if (params?.sort) qs.set('sort', params.sort)
      if (params?.limit !== undefined) qs.set('limit', String(params.limit))
      return apiFetch<ApiCustomerSummary[]>(`/api/customers?${qs}`)
    },
    getByPhone(phone: string) {
      return apiFetch<ApiCustomerDetail>(
        `/api/customers?phone=${encodeURIComponent(phone)}`
      )
    },
  },
}
