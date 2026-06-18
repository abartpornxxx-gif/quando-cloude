import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { NotificheBell } from '@/components/NotificheBell'
import { alertCliente } from '@/lib/notifiche'

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

  let alertCount = 0
  if (user.email) {
    const cliente = await prisma.cliente.findFirst({ where: { email: user.email }, select: { id: true } })
    if (cliente) alertCount = await alertCliente(cliente.id)
  }

  const NAV = [
    { label: 'I miei lavori', href: '/cliente/lavori' },
    { label: 'Pagamenti', href: '/cliente/pagamenti' },
    { label: 'Documenti', href: '/cliente/documenti' },
    { label: 'Servizi', href: '/cliente/servizi' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            {/* Logo */}
            <Link href="/cliente/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white text-sm font-bold select-none">Q</div>
              <span className="font-bold text-gray-900 hidden sm:block">QUADRO</span>
              <span className="hidden md:inline-flex items-center rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                Portale
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto scrollbar-none">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-violet-50 hover:text-violet-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden lg:block text-sm text-gray-500 truncate max-w-32">
                {nome.split(' ')[0]}
              </span>
              <NotificheBell count={alertCount} href="/cliente/notifiche" colore="violet" />
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t border-gray-100">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex overflow-x-auto scrollbar-none">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-violet-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
