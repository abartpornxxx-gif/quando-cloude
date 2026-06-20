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
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Illustrazione */}
        <div className="flex justify-center mb-6">
          <Image
            src="/immagini/illustrazione-login.png"
            width={220}
            height={180}
            alt="QUADRO"
            className="select-none"
            priority
          />
        </div>

        {/* Logo + titolo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <Image src="/immagini/logo-quadro.png" width={36} height={36} alt="QUADRO" priority />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">QUADRO</h1>
          <p className="mt-1 text-sm text-gray-500">Accedi al tuo account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="nome@esempio.it"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Non hai un account?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  )
}
