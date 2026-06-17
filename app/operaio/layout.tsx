import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { OfflineBanner } from '@/components/OfflineBanner'

export default async function OperaioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'operaio') redirect('/login')

  // ORDINE 4 — Controlla rapportino pendente per il banner persistente
  let rapportinoPendente: { id: string; commessaNome: string } | null = null
  if (user.email) {
    const operaio = await prisma.operaio.findFirst({ where: { email: user.email }, select: { id: true } })
    if (operaio) {
      const g = await prisma.giornata.findFirst({
        where: { operaioId: operaio.id, fase: 'fine', stato: 'bozza', rapportino: null },
        select: { id: true, commessa: { select: { nome: true } } },
        orderBy: { data: 'desc' },
      })
      if (g) rapportinoPendente = { id: g.id, commessaNome: g.commessa.nome }
    }
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-full">
      <nav className="bg-emerald-700 text-white shadow-md">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 font-bold text-sm">Q</div>
              <span className="font-bold">QUADRO</span>
              <span className="hidden rounded-full bg-emerald-500/60 px-2 py-0.5 text-xs font-semibold sm:inline">Cantiere</span>
            </div>
            <div className="flex items-center gap-3">
              {rapportinoPendente && (
                <a href={`/operaio/giornata/${rapportinoPendente.id}/rapportino`}
                  className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white animate-pulse">
                  ⚠️ Rapportino
                </a>
              )}
              <form action={signOut}>
                <button type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-600">
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* ORDINE 4 — Banner rapportino mancante (sempre visibile su tutte le pagine operaio) */}
      {rapportinoPendente && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
          <span className="font-semibold">⚠️ Hai un rapportino da compilare!</span>
          {' '}
          <a href={`/operaio/giornata/${rapportinoPendente.id}/rapportino`}
            className="underline font-bold">
            Vai ora →
          </a>
        </div>
      )}

      <OfflineBanner />

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:px-6">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white safe-area-pb">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          <a href="/operaio/dashboard"
            className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-600 hover:text-emerald-700">
            <span className="text-lg">🏗️</span>
            <span>Cantieri</span>
          </a>
          <a href="/operaio/giornata/nuova"
            className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-emerald-700">
            <span className="text-lg">➕</span>
            <span>Giornata</span>
          </a>
          <a href="/operaio/domani"
            className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-600 hover:text-emerald-700">
            <span className="text-lg">📅</span>
            <span>Domani</span>
          </a>
          <a href="/operaio/calendario"
            className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-600 hover:text-emerald-700">
            <span className="text-lg">🗓️</span>
            <span>Calendario</span>
          </a>
          <a href="/operaio/profilo"
            className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-600 hover:text-emerald-700">
            <span className="text-lg">👤</span>
            <span>Profilo</span>
          </a>
        </div>
      </nav>
    </div>
  )
}
