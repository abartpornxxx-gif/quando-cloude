import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificheBell } from '@/components/NotificheBell'
import { alertMagazziniere } from '@/lib/notifiche'

export default async function MagazzinoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'magazziniere') redirect('/login')

  const alertCount = await alertMagazziniere()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const NAV_ITEMS = [
    { label: 'Dashboard', href: '/magazziniere/dashboard' },
    { label: 'Richieste', href: '/magazziniere/richieste' },
    { label: 'Giacenza', href: '/magazziniere/magazzino' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-amber-800 text-white shadow-lg">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo + nav */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 font-bold text-sm select-none">Q</div>
                <div className="hidden sm:block">
                  <p className="font-bold text-sm leading-tight">QUADRO</p>
                  <p className="text-amber-200 text-xs leading-tight">Magazzino</p>
                </div>
              </div>
              <nav className="flex items-center gap-1">
                {NAV_ITEMS.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-700 hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <NotificheBell count={alertCount} href="/magazziniere/notifiche" colore="yellow" />
              <form action={signOut}>
                <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-700">
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
