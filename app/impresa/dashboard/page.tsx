import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'

export default async function ImpresaDashboardPage() {
  await requireImpresa()

  const [commesseAperte, rapportiniMancanti, scadenzeVicine, ordiniAperti, richiesteNuove] = await Promise.all([
    prisma.commessa.count({ where: { stato: 'aperta' } }),
    prisma.giornata.count({ where: { fase: 'fine', stato: 'bozza', rapportino: null } }),
    prisma.fatturaAttiva.count({
      where: {
        stato: { in: ['da_incassare', 'scaduta'] },
        dataScadenza: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.ordineFornitore.count({ where: { stato: { in: ['richiesto', 'ordinato'] } } }),
    prisma.richiestaOfferta.count({ where: { stato: 'nuova' } }),
  ])

  const commesseRecenti = await prisma.commessa.findMany({
    where: { stato: 'aperta' },
    include: { cliente: { select: { nome: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  })

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-8">

      {/* Hero bar */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 px-6 py-5 flex items-center justify-between gap-4 shadow-md">
        <div>
          <p className="text-slate-400 text-xs font-medium capitalize">{oggi}</p>
          <h1 className="text-xl font-bold text-white mt-0.5">Buongiorno</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
          {rapportiniMancanti > 0 && (
            <Link href="/impresa/giornate"
              className="flex items-center gap-1.5 rounded-xl bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30">
              ⚠ {rapportiniMancanti} rapportini mancanti
            </Link>
          )}
          {richiesteNuove > 0 && (
            <Link href="/impresa/richieste-offerte"
              className="flex items-center gap-1.5 rounded-xl bg-violet-500/20 border border-violet-500/40 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/30">
              📬 {richiesteNuove} richieste nuove
            </Link>
          )}
        </div>
      </div>

      {/* KPI */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Panoramica</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Cantieri aperti" value={commesseAperte} sub="Commesse attive" href="/impresa/commesse" variant="info" />
          <StatCard label="Rapportini" value={rapportiniMancanti > 0 ? rapportiniMancanti : '✓'} sub={rapportiniMancanti > 0 ? 'Mancanti' : 'Tutto ok'} href="/impresa/giornate" variant={rapportiniMancanti > 0 ? 'danger' : 'default'} />
          <StatCard label="Scadenze 30g" value={scadenzeVicine} sub={scadenzeVicine > 0 ? 'Fatture in scadenza' : 'Nessuna'} href="/impresa/scadenzario" variant={scadenzeVicine > 0 ? 'warning' : 'default'} />
          <StatCard label="Ordini aperti" value={ordiniAperti} sub="Da fornitori" href="/impresa/ordini" variant="default" />
          <StatCard label="Richieste offerte" value={richiesteNuove > 0 ? richiesteNuove : '–'} sub={richiesteNuove > 0 ? 'Da clienti' : 'Nessuna'} href="/impresa/richieste-offerte" variant={richiesteNuove > 0 ? 'purple' : 'default'} />
        </div>
      </div>

      {/* Azioni rapide */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Azioni rapide</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/impresa/preventivi/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
            + Nuovo preventivo
          </Link>
          <Link href="/impresa/commesse/nuova"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            + Nuova commessa
          </Link>
          <Link href="/impresa/ordini/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            + Ordine fornitore
          </Link>
          <Link href="/impresa/notifiche"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            🔔 Centro notifiche
          </Link>
        </div>
      </div>

      {/* Cantieri in corso */}
      {commesseRecenti.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cantieri in corso</p>
            <Link href="/impresa/commesse" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Vedi tutte →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {commesseRecenti.map(c => (
              <Link key={c.id} href={`/impresa/commesse/${c.id}`}
                className="group flex items-center justify-between rounded-2xl bg-white border border-gray-200 px-4 py-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">{c.nome}</p>
                  {c.cliente && <p className="text-xs text-gray-400 mt-0.5">{c.cliente.nome}</p>}
                </div>
                <div className="flex flex-col items-end shrink-0 ml-3 gap-1.5">
                  <p className="text-xs font-medium text-gray-500">{formatEuro(c.preventivato)}</p>
                  <Badge variant="success" dot>aperta</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {commesseRecenti.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-3xl mb-3">🏗️</p>
          <p className="font-semibold text-gray-700">Nessun cantiere aperto</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Crea un preventivo e trasformalo in commessa</p>
          <Link href="/impresa/preventivi/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            + Crea preventivo
          </Link>
        </div>
      )}

    </div>
  )
}
