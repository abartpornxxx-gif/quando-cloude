'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PannelloForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/pannello-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      const data = await res.json()
      setError(data.error || 'Credenziali non valide')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      {error && (
        <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-2.5 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 px-3 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wider">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 px-3 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? 'Accesso in corso…' : 'Entra'}
        </button>
      </form>
    </div>
  )
}
