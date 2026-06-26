import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { OfflineBanner } from '@/components/OfflineBanner'
import { NotificheBell } from '@/components/NotificheBell'
import { listaNotificheOperaio } from '@/lib/notifiche'
import { AssistenteContestuale } from '@/components/ai/AssistenteContestuale'

import { OperaioBottomNav } from '@/components/OperaioBottomNav'
import { LogoutButton } from '@/components/LogoutButton'
import Image from 'next/image'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { FirstAccessModal } from '@/components/FirstAccessModal'


export default async function OperaioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'operaio') redirect('/login')

  let rapportinoPendente: { id: string; commessaNome: string } | null = null
  let alertCount = 0
  let showFirstAccess = false
  let dbNome = ''

  if (user.email) {
    const operaio = await prisma.operaio.findFirst({
      where: { email: user.email },
      select: { id: true, nome: true, primoAccesso: true }
    })
    if (operaio) {
      dbNome = operaio.nome
      showFirstAccess = operaio.primoAccesso
      const [g, notifiche] = await Promise.all([
        prisma.giornata.findFirst({
          where: { operaioId: operaio.id, fase: 'fine', stato: 'bozza', rapportino: { is: null } },
          select: { id: true, commessa: { select: { nome: true } } },
          orderBy: { data: 'desc' },
        }),
        listaNotificheOperaio(operaio.id, user.id),
      ])
      if (g) rapportinoPendente = { id: g.id, commessaNome: g.commessa.nome }
      alertCount = notifiche.filter(n => !n.letta).length
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="sticky top-0 z-40 bg-emerald-900 text-white" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.25)' }}>
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/operaio/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 shrink-0">
                <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">QUADRO</p>
                <p className="text-emerald-300 text-xs leading-tight">Cantiere</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              {rapportinoPendente && (
                <Link
                  href={`/operaio/giornata/${rapportinoPendente.id}/rapportino`}
                  className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white"
                >
                  <AlertTriangle size={12} className="text-white shrink-0" />
                  Rapportino
                </Link>
              )}
              <NotificheBell count={alertCount} href="/operaio/notifiche" colore="emerald" />
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-800" />
            </div>
          </div>
        </div>
      </nav>

      {/* Banner rapportino mancante */}
      {rapportinoPendente && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-center text-sm">
          <span className="font-semibold inline-flex items-center gap-1">
            <AlertTriangle size={14} className="text-white shrink-0" />
            Rapportino da compilare:
          </span>
          {' '}
          <span className="text-red-100">{rapportinoPendente.commessaNome}</span>
          {' · '}
          <Link href={`/operaio/giornata/${rapportinoPendente.id}/rapportino`} className="underline font-bold">
            Compila ora →
          </Link>
        </div>
      )}

      <OfflineBanner />

      <main className="mx-auto max-w-2xl px-4 py-5 pb-24 sm:px-6">{children}</main>
      <AssistenteContestuale role="operaio" />

      {showFirstAccess && (
        <FirstAccessModal userRole="operaio" userEmail={user.email!} userName={dbNome} />
      )}

      <OperaioBottomNav alertCount={alertCount} />
    </div>
  )
}
