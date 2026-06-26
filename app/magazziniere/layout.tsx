import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { NotificheBell } from '@/components/NotificheBell'
import { LogoutButton } from '@/components/LogoutButton'
import { listaNotificheMagazziniere } from '@/lib/notifiche'
import { AssistenteContestuale } from '@/components/ai/AssistenteContestuale'
import { MagazzinoNav } from '@/components/MagazzinoNav'
import { prisma } from '@/lib/prisma'
import { FirstAccessModal } from '@/components/FirstAccessModal'


export default async function MagazzinoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'magazziniere') redirect('/login')

  const notifiche = await listaNotificheMagazziniere(user.id)
  const alertCount = notifiche.filter(n => !n.letta).length

  let showFirstAccess = false
  let dbNome = ''

  if (user.email) {
    const mag = await prisma.magazziniere.findFirst({
      where: { email: user.email },
      select: { nome: true, primoAccesso: true }
    })
    if (mag) {
      dbNome = mag.nome
      showFirstAccess = mag.primoAccesso
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-amber-800 text-white shadow-lg">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex h-16 items-center justify-between gap-2">
            {/* Logo + nav */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <Link href="/magazziniere/dashboard" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 shrink-0">
                  <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
                </div>
                <div className="hidden sm:block">
                  <p className="font-bold text-sm leading-tight">QUADRO</p>
                  <p className="text-amber-200 text-xs leading-tight">Magazzino</p>
                </div>
              </Link>
              <MagazzinoNav />
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <NotificheBell count={alertCount} href="/magazziniere/notifiche" colore="amber" />
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-700" />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      <AssistenteContestuale role="magazziniere" />
      {showFirstAccess && (
        <FirstAccessModal userRole="magazziniere" userEmail={user.email!} userName={dbNome} />
      )}
    </div>
  )
}
