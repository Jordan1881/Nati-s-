import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/orders/today', label: 'הזמנות' },
  { to: '/orders/new', label: 'הזמנה חדשה' },
  { to: '/summary/today', label: 'סיכום יומי' },
  { to: '/customers', label: 'לקוחות' },
  { to: '/menu', label: 'תפריט' },
] as const

export default function NavBar() {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`

  return (
    <nav dir="rtl" className="bg-white border-b sticky top-0 z-30">
      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-1 px-4 h-11">
        <span className="font-bold text-gray-900 me-4 text-sm">נטיס</span>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            {label}
          </NavLink>
        ))}
      </div>

      {/* Mobile top bar */}
      <div className="flex sm:hidden items-center justify-between px-4 h-11">
        <span className="font-bold text-gray-900 text-sm">נטיס</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label={open ? 'סגור תפריט' : 'פתח תפריט'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden border-t flex flex-col py-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
