import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { NotificheBell } from '@/components/NotificheBell'
import { LogoutButton } from '@/components/LogoutButton'
import { listaNotificheMagazziniere } from '@/lib/notifiche'
import { LayoutDashboard, Inbox, Warehouse, type LucideIcon } from 'lucide-react'

export default async function MagazzinoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'magazziniere') redirect('/login')

  const notifiche = await listaNotificheMagazziniere(user.id)
  const alertCount = notifiche.filter(n => !n.letta).length

  const NAV_ITEMS: { label: string; href: string; Icon: LucideIcon }[] = [
    { label: 'Dashboard', href: '/magazziniere/dashboard', Icon: LayoutDashboard },
    { label: 'Richieste', href: '/magazziniere/richieste', Icon: Inbox },
    { label: 'Giacenza', href: '/magazziniere/magazzino', Icon: Warehouse },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-amber-800 text-white shadow-lg">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo + nav */}
            <div className="flex items-center gap-4">
              <a href="/magazziniere/dashboard" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 shrink-0">
                  <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
                </div>
                <div className="hidden sm:block">
                  <p className="font-bold text-sm leading-tight">QUADRO</p>
                  <p className="text-amber-200 text-xs leading-tight">Magazzino</p>
                </div>
              </a>
              <nav className="flex items-center gap-1">
                {NAV_ITEMS.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-700 hover:text-white"
                  >
                    <item.Icon size={14} className="opacity-80 shrink-0" />
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <NotificheBell count={alertCount} href="/magazziniere/notifiche" colore="yellow" />
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-700" />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
