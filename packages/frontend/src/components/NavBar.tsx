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
        ? 'bg-brand-500/20 text-brand-400'
        : 'text-[#C4A882] hover:text-white hover:bg-white/10'
    }`

  return (
    <nav dir="rtl" className="bg-[#1C1410] border-b border-[#2E1F17] sticky top-0 z-30">
      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-1 px-4 h-12">
        <span className="font-bold text-brand-400 me-5 text-base tracking-wide">Nati's</span>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            {label}
          </NavLink>
        ))}
      </div>

      {/* Mobile top bar */}
      <div className="flex sm:hidden items-center justify-between px-4 h-12">
        <span className="font-bold text-brand-400 text-base tracking-wide">Nati's</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-lg text-[#C4A882] hover:bg-white/10 transition-colors"
          aria-label={open ? 'סגור תפריט' : 'פתח תפריט'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden border-t border-[#2E1F17] flex flex-col py-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-[#C4A882] hover:bg-white/10 hover:text-white'
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
