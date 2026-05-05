import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, X } from 'lucide-react'

interface MenuItem {
  id: number
  name: string
  category: string
  unit_label: string | null
  price: number
  active: boolean
  display_order: number
}

const CATEGORIES = ['תבשילים', 'חומוס', 'סלטים'] as const

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return null
  return res.json()
}

function useMenuItems() {
  return useQuery<MenuItem[]>({
    queryKey: ['menu-items'],
    queryFn: () => apiFetch('/api/menu-items'),
  })
}

// ── Item form modal ────────────────────────────────────────────────────────────

interface ItemFormState {
  name: string
  category: string
  unit_label: string
  price: string
}

function ItemModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<ItemFormState> & { category?: string }
  onClose: () => void
  onSave: (data: ItemFormState) => void
}) {
  const [form, setForm] = useState<ItemFormState>({
    name: initial.name ?? '',
    category: initial.category ?? CATEGORIES[0],
    unit_label: initial.unit_label ?? '',
    price: initial.price ?? '',
  })
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הפריט חובה'); return }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('מחיר לא תקין'); return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{initial.name ? 'עריכת פריט' : 'פריט חדש'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">שם</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">קטגוריה</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תווית יחידה (אופציונלי)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder='½ ק"ג, 1 ק"ג, ליח׳...'
              value={form.unit_label}
              onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">מחיר (₪)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="w-full border rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              dir="ltr"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 transition-colors mt-1"
          >
            שמור
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Sortable item row ──────────────────────────────────────────────────────────

function SortableRow({
  item,
  onEdit,
  onToggleActive,
}: {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onToggleActive: (item: MenuItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const price = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(item.price)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-2 px-3 rounded-lg border bg-white ${
        item.active ? '' : 'opacity-40'
      }`}
    >
      <button
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="גרור לסידור מחדש"
      >
        <GripVertical size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <span className="font-medium">
          {item.name}
          {item.unit_label && <span className="text-gray-500 text-sm me-1"> {item.unit_label}</span>}
        </span>
      </div>

      <span className="text-sm text-gray-700 whitespace-nowrap" dir="ltr">{price}</span>

      <button
        onClick={() => onEdit(item)}
        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
        aria-label="ערוך"
      >
        <Pencil size={16} />
      </button>

      {item.active ? (
        <button
          onClick={() => onToggleActive(item)}
          className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 transition-colors whitespace-nowrap"
        >
          השבת
        </button>
      ) : (
        <button
          onClick={() => onToggleActive(item)}
          className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 transition-colors whitespace-nowrap"
        >
          השב
        </button>
      )}
    </div>
  )
}

// ── Category section ───────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  onEdit,
  onToggleActive,
  onAdd,
  onReorder,
}: {
  category: string
  items: MenuItem[]
  onEdit: (item: MenuItem) => void
  onToggleActive: (item: MenuItem) => void
  onAdd: (category: string) => void
  onReorder: (category: string, ids: number[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor))
  const sorted = [...items].sort((a, b) => a.display_order - b.display_order || a.id - b.id)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sorted.findIndex(i => i.id === active.id)
    const newIndex = sorted.findIndex(i => i.id === over.id)
    const reordered = arrayMove(sorted, oldIndex, newIndex)
    onReorder(category, reordered.map(i => i.id))
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{category}</h2>
        <button
          onClick={() => onAdd(category)}
          className="text-sm text-blue-600 hover:underline"
        >
          + הוסף פריט
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-400 text-sm py-2">אין פריטים בקטגוריה זו</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {sorted.map(item => (
                <SortableRow
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onToggleActive={onToggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MenuAdminPage() {
  const qc = useQueryClient()
  const { data: items = [], isLoading, isError } = useMenuItems()

  const [modal, setModal] = useState<
    | { mode: 'add'; category: string }
    | { mode: 'edit'; item: MenuItem }
    | null
  >(null)

  const patchItem = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiFetch(`/api/menu-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items'] }),
  })

  const createItem = useMutation({
    mutationFn: (data: object) =>
      apiFetch('/api/menu-items', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items'] }),
  })

  function handleSave(form: { name: string; category: string; unit_label: string; price: string }) {
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit_label: form.unit_label.trim() || null,
      price: Number(form.price),
    }
    if (modal?.mode === 'edit') {
      patchItem.mutate({ id: modal.item.id, data: payload })
    } else {
      createItem.mutate(payload)
    }
    setModal(null)
  }

  function handleToggleActive(item: MenuItem) {
    patchItem.mutate({ id: item.id, data: { active: !item.active } })
  }

  function handleReorder(category: string, orderedIds: number[]) {
    orderedIds.forEach((id, index) => {
      const item = items.find(i => i.id === id)
      if (item && item.display_order !== index) {
        patchItem.mutate({ id, data: { display_order: index } })
      }
    })
  }

  if (isLoading) return <div dir="rtl" className="p-8 text-center text-gray-500">טוען תפריט...</div>
  if (isError) return <div dir="rtl" className="p-8 text-center text-red-600">שגיאה בטעינת התפריט</div>

  return (
    <main className="max-w-2xl mx-auto p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">ניהול תפריט</h1>

      {CATEGORIES.map(category => (
        <CategorySection
          key={category}
          category={category}
          items={items.filter(i => i.category === category)}
          onEdit={item => setModal({ mode: 'edit', item })}
          onToggleActive={handleToggleActive}
          onAdd={cat => setModal({ mode: 'add', category: cat })}
          onReorder={handleReorder}
        />
      ))}

      {modal && (
        <ItemModal
          initial={
            modal.mode === 'edit'
              ? {
                  name: modal.item.name,
                  category: modal.item.category,
                  unit_label: modal.item.unit_label ?? '',
                  price: String(modal.item.price),
                }
              : { category: modal.category }
          }
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </main>
  )
}
