import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatData } from '@/lib/format'

export default async function OperaioDashboardPage() {
  const { operaio } = await requireOperaio()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [assegnazioni, giornataAttiva, giornataRapportinoPendente] = await Promise.all([
    prisma.commessaOperaio.findMany({
      where: { operaioId: operaio.id },
      include: {
        commessa: {
          include: {
            cliente: { select: { nome: true } },
            giornate: {
              where: { operaioId: operaio.id },
              orderBy: { data: 'desc' },
              take: 1,
              select: { data: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // ORDINE 3 — giornata in corso oggi (non ancora chiusa)
    prisma.giornata.findFirst({
      where: { operaioId: operaio.id, data: today, stato: 'bozza' },
      select: { id: true, fase: true, commessa: { select: { nome: true } } },
    }),
    // ORDINE 4 — giornata a fine giornata senza rapportino (può essere di ieri)
    prisma.giornata.findFirst({
      where: {
        operaioId: operaio.id,
        fase: 'fine',
        stato: 'bozza',
        rapportino: null,
      },
      select: { id: true, data: true, commessa: { select: { nome: true } } },
      orderBy: { data: 'desc' },
    }),
  ])

  const commesseAperte = assegnazioni.filter(a => a.commessa.stato === 'aperta')
  const commesseChiuse = assegnazioni.filter(a => a.commessa.stato === 'chiusa')

  return (
    <div className="space-y-4">
      {/* ORDINE 4 — Avviso rapportino mancante (in-app notification) */}
      {giornataRapportinoPendente && (
        <div className="rounded-xl bg-red-600 text-white p-4 shadow-lg">
          <p className="font-bold text-base">⚠️ Rapportino da compilare!</p>
          <p className="text-sm mt-1 text-red-100">
            {giornataRapportinoPendente.commessa.nome} —{' '}
            {new Date(giornataRapportinoPendente.data).toLocaleDateString('it-IT')}
          </p>
          <a
            href={`/operaio/giornata/${giornataRapportinoPendente.id}/rapportino`}
            className="mt-3 block w-full bg-white text-red-600 font-bold py-2 rounded-lg text-center text-sm"
          >
            Compila ora →
          </a>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900">Ciao, {operaio.nome.split(' ')[0]}!</h1>
        <p className="mt-1 text-sm text-gray-500">
          {commesseAperte.length} cantier{commesseAperte.length === 1 ? 'e aperto' : 'i aperti'}
        </p>
      </div>

      {/* ORDINE 3 — Giornata in corso: mostra "Riprendi" invece di "Inizia" */}
      {giornataAttiva ? (
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-700">Giornata in corso</p>
          <p className="text-sm text-gray-700 mt-1">{giornataAttiva.commessa.nome}</p>
          <a
            href={`/operaio/giornata/${giornataAttiva.id}/lavori`}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-700"
          >
            <span>▶ Riprendi giornata</span>
          </a>
        </div>
      ) : (
        !giornataRapportinoPendente && (
          <Link href="/operaio/giornata/nuova"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-white font-semibold shadow-lg hover:bg-emerald-700 active:scale-95 transition-transform">
            <span className="text-2xl">➕</span>
            <span>Inizia giornata lavorativa</span>
          </Link>
        )
      )}

      {commesseAperte.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-500 text-sm">Nessun cantiere assegnato.<br />Chiedi alla tua impresa di assegnarti a una commessa.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cantieri aperti</h2>
          {commesseAperte.map(a => {
            const c = a.commessa
            const ultimaGiornata = c.giornate[0]
            return (
              <div key={a.commessaId}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{c.nome}</p>
                    {c.cliente && <p className="text-sm text-gray-500">{c.cliente.nome}</p>}
                    {c.indirizzoCantiere && (
                      <p className="mt-1 text-xs text-gray-400">📍 {c.indirizzoCantiere}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Aperta
                  </span>
                </div>
                {ultimaGiornata && (
                  <p className="mt-2 text-xs text-gray-400">
                    Ultima giornata: {formatData(ultimaGiornata.data)}
                  </p>
                )}
              </div>
            )
          })}

          {commesseChiuse.length > 0 && (
            <>
              <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Cantieri chiusi</h2>
              {commesseChiuse.map(a => (
                <div key={a.commessaId}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-60">
                  <p className="font-medium text-gray-700">{a.commessa.nome}</p>
                  {a.commessa.cliente && <p className="text-sm text-gray-500">{a.commessa.cliente.nome}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
