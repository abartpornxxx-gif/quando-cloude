import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { NotificheBell } from '@/components/NotificheBell'
import { LogoutButton } from '@/components/LogoutButton'
import { listaNotificheCliente } from '@/lib/notifiche'
import { ClienteNav } from '@/components/ClienteNav'

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
    if (cliente) {
      const notifiche = await listaNotificheCliente(cliente.id, user.id)
      alertCount = notifiche.filter(n => !n.letta).length
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-violet-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3">
            {/* Logo */}
            <Link href="/cliente/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500 shadow-sm shrink-0">
                <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-white tracking-tight">QUADRO</span>
                <span className="hidden sm:block text-xs font-medium text-violet-300">Portale</span>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden lg:block text-sm text-violet-300 truncate max-w-32">{nome.split(' ')[0]}</span>
              <NotificheBell count={alertCount} href="/cliente/notifiche" colore="violet" />
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-600 hover:text-white" />
            </div>
          </div>
        </div>

        <ClienteNav />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
