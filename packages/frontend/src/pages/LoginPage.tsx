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
    <main className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center">NATI's — כניסה</h1>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="font-medium">סיסמה</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 transition-colors"
        >
          כניסה
        </button>
      </form>
    </main>
  )
}
