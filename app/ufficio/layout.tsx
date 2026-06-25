import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { NotificheBell } from '@/components/NotificheBell'
import Link from 'next/link'
import { LogoutButton } from '@/components/LogoutButton'
import { alertUfficio } from '@/lib/notifiche'
import { AssistenteContestuale } from '@/components/ai/AssistenteContestuale'
import { UfficioNav } from '@/components/UfficioNav'
import { prisma } from '@/lib/prisma'
import { FirstAccessModal } from '@/components/FirstAccessModal'


export default async function UfficioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'ufficio') redirect('/login')

  const nome = user.user_metadata?.full_name ?? user.email ?? 'Ufficio'
  const alertCount = await alertUfficio(user.id)

  let showFirstAccess = false
  let dbNome = ''

  if (user.email) {
    const col = await prisma.collaboratoreUfficio.findFirst({
      where: { email: user.email },
      select: { nome: true, primoAccesso: true }
    })
    if (col) {
      dbNome = col.nome
      showFirstAccess = col.primoAccesso
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-teal-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/ufficio/dashboard" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500 shadow-sm shrink-0">
                <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-white tracking-tight">QUADRO</span>
                <span className="hidden sm:block text-xs font-medium text-teal-200">Ufficio</span>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden lg:block text-sm text-teal-200 truncate max-w-32">{nome.split(' ')[0]}</span>
              <NotificheBell count={alertCount} href="/ufficio/notifiche" colore="teal" />
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-600 hover:text-white" />
            </div>
          </div>
        </div>
        <UfficioNav />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <AssistenteContestuale role="ufficio" />
      {showFirstAccess && (
        <FirstAccessModal userRole="ufficio" userEmail={user.email!} userName={dbNome} />
      )}
    </div>
  )
}

