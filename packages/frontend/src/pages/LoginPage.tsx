import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 204) {
        navigate('/orders/today')
      } else {
        setError('סיסמה שגויה')
      }
    } catch {
      setError('סיסמה שגויה')
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      dir="rtl"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #FFE9D5 0%, #FDFAF6 65%)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl border border-[#F0E4D0] p-8 w-full max-w-sm flex flex-col gap-5"
      >
        <div className="text-center mb-1">
          <div className="text-3xl font-bold text-brand-500 tracking-wide">Nati's</div>
          <div className="text-sm text-gray-400 mt-1">כניסה למערכת</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-medium text-sm text-gray-700">סיסמה</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-[#E8D8C4] rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-colors"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <button
          type="submit"
          className="bg-brand-500 text-white rounded-xl py-2.5 font-semibold hover:bg-brand-600 transition-colors shadow-sm"
        >
          כניסה
        </button>
      </form>
    </main>
  )
}
