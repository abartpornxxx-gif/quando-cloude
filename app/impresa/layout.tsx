import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ImpresaNav } from '@/components/ImpresaNav'
import { NotificheBell } from '@/components/NotificheBell'
import { LogoutButton } from '@/components/LogoutButton'
import { listaNotificheImpresa } from '@/lib/notifiche'
import Link from 'next/link'
import Image from 'next/image'

export default async function ImpresaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'impresa') {
    redirect('/login')
  }

  const notifiche = await listaNotificheImpresa(user.id)
  const alertCount = notifiche.filter(n => !n.letta).length

  const userName = user.user_metadata?.full_name ?? user.email ?? ''

  return (
    <div className="min-h-full">
      {/* Header scuro con identità forte */}
      <header className="sticky top-0 z-40 bg-slate-900 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Logo + brand */}
            <Link href="/impresa/dashboard" className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 shadow-sm shrink-0">
                <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-white tracking-tight">QUADRO</span>
                <span className="hidden sm:block text-xs font-medium text-slate-400">Impresa</span>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {userName && (
                <span className="hidden lg:block text-sm text-slate-400 truncate max-w-40">
                  {userName.split(' ')[0]}
                </span>
              )}
              <NotificheBell count={alertCount} href="/impresa/notifiche" colore="blue" />
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white" />
            </div>
          </div>
        </div>
        <ImpresaNav />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
