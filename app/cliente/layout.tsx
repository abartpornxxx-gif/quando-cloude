import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'cliente') {
    redirect('/login')
  }

  const nome = user.user_metadata?.full_name ?? user.email ?? 'Cliente'

  const NAV = [
    { label: '🏗 I miei lavori', href: '/cliente/lavori' },
    { label: '💳 Pagamenti', href: '/cliente/pagamenti' },
    { label: '📄 Documenti', href: '/cliente/documenti' },
    { label: '✨ Servizi', href: '/cliente/servizi' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-violet-700 text-white shadow-md">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/cliente/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500">
                  <span className="text-sm font-bold">Q</span>
                </div>
                <span className="text-base font-bold tracking-tight hidden sm:block">QUADRO</span>
              </Link>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-600 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="hidden text-xs text-violet-200 sm:block truncate max-w-32">
                {nome.split(' ')[0]}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-violet-100 hover:bg-violet-600"
                >
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
