import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { OfflineBanner } from '@/components/OfflineBanner'
import { NotificheBell } from '@/components/NotificheBell'
import { listaNotificheOperaio } from '@/lib/notifiche'
import { OperaioBottomNav } from '@/components/OperaioBottomNav'
import Image from 'next/image'

export default async function OperaioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'operaio') redirect('/login')

  let rapportinoPendente: { id: string; commessaNome: string } | null = null
  let alertCount = 0

  if (user.email) {
    const operaio = await prisma.operaio.findFirst({ where: { email: user.email }, select: { id: true } })
    if (operaio) {
      const [g, notifiche] = await Promise.all([
        prisma.giornata.findFirst({
          where: { operaioId: operaio.id, fase: 'fine', stato: 'bozza', rapportino: null },
          select: { id: true, commessa: { select: { nome: true } } },
          orderBy: { data: 'desc' },
        }),
        listaNotificheOperaio(operaio.id, user.id),
      ])
      if (g) rapportinoPendente = { id: g.id, commessaNome: g.commessa.nome }
      alertCount = notifiche.filter(n => !n.letta).length
    }
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <nav className="bg-emerald-900 text-white shadow-lg">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-between">
            <a href="/operaio/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 shrink-0">
                <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">QUADRO</p>
                <p className="text-emerald-300 text-xs leading-tight">Cantiere</p>
              </div>
            </a>
            <div className="flex items-center gap-2">
              {rapportinoPendente && (
                <a
                  href={`/operaio/giornata/${rapportinoPendente.id}/rapportino`}
                  className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white"
                >
                  <Image src="/immagini/icona-avviso.png" width={12} height={12} alt="" className="brightness-0 invert" />
                  Rapportino
                </a>
              )}
              <NotificheBell count={alertCount} href="/operaio/notifiche" colore="emerald" />
              <form action={signOut}>
                <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-200 hover:bg-emerald-800">
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Banner rapportino mancante */}
      {rapportinoPendente && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-center text-sm">
          <span className="font-semibold inline-flex items-center gap-1">
            <Image src="/immagini/icona-avviso.png" width={14} height={14} alt="" className="brightness-0 invert" />
            Rapportino da compilare:
          </span>
          {' '}
          <span className="text-red-100">{rapportinoPendente.commessaNome}</span>
          {' · '}
          <a href={`/operaio/giornata/${rapportinoPendente.id}/rapportino`} className="underline font-bold">
            Compila ora →
          </a>
        </div>
      )}

      <OfflineBanner />

      <main className="mx-auto max-w-2xl px-4 py-5 pb-24 sm:px-6">{children}</main>

      <OperaioBottomNav alertCount={alertCount} />
    </div>
  )
}
