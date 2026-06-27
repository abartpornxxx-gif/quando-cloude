'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

const ROLE_HOME: Record<UserRole, string> = {
  impresa: '/impresa/dashboard',
  operaio: '/operaio/dashboard',
  cliente: '/cliente/dashboard',
  magazziniere: '/magazziniere/dashboard',
  ufficio: '/ufficio/dashboard',
  libero: '/libero/dashboard',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o password non validi.')
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role as UserRole | undefined
    router.push(role ? ROLE_HOME[role] : '/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden">

        {/* Header strip */}
        <div className="bg-slate-900 px-8 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Image src="/immagini/logo-quadro.png" width={32} height={32} alt="QUADRO" priority />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">QUADRO</h1>
          <p className="mt-0.5 text-xs text-slate-400">Gestionale impianti elettrici</p>
        </div>

        {/* Form */}
        <div className="px-8 py-7">
          <p className="text-sm font-semibold text-gray-700 mb-5">Accedi al tuo account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="nome@esempio.it"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-3">
                <span className="text-red-500 text-sm">⚠</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            Non hai un account?{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Registrati
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">© {new Date().getFullYear()} QUADRO — DM 37/2008</p>
    </div>
  )
}
