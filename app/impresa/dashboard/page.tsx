import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { StatCard } from '@/components/ui/StatCard'

// ─── Grafici SVG (Server Component, nessuna libreria) ─────────────────────────

function RingChart({
  value,
  total,
  label,
  sub,
  hex,
}: {
  value: number
  total: number
  label: string
  sub: string
  hex: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const r = 36
  const circ = parseFloat((2 * Math.PI * r).toFixed(2))
  const dash = parseFloat(((pct / 100) * circ).toFixed(2))
  const gap = parseFloat((circ - dash).toFixed(2))

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
          {pct > 0 && (
            <circle
              cx="48" cy="48" r={r} fill="none"
              stroke={hex} strokeWidth="9"
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900 leading-none">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function BudgetBar({ costi, preventivato }: { costi: number; preventivato: number }) {
  const pct = preventivato > 0 ? Math.min(Math.round((costi / preventivato) * 100), 100) : 0
  const barCls = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
  const txtCls = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-400'
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">Budget utilizzato</span>
        <span className={`text-xs font-semibold ${txtCls}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barCls} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ImpresaDashboardPage() {
  await requireImpresa()

  const tra30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const settimanaFa = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    commesseTotali,
    commesseAperte,
    rapportiniMancanti,
    scadenzeVicine,
    ordiniAperti,
    richiesteNuove,
    giornateChiuseSettimana,
    rapportiniOkSettimana,
    fattureTotali,
    fattureIncassate,
    commesseConMargine,
    commesseRecenti,
    commesseAdempimenti,
  ] = await Promise.all([
    prisma.commessa.count(),
    prisma.commessa.count({ where: { stato: 'aperta' } }),
    prisma.giornata.count({ where: { fase: 'fine', stato: 'bozza', rapportino: null } }),
    prisma.fatturaAttiva.count({
      where: { stato: { in: ['da_incassare', 'scaduta'] }, dataScadenza: { lte: tra30, not: null } },
    }),
    prisma.ordineFornitore.count({ where: { stato: { in: ['richiesto', 'ordinato'] } } }),
    prisma.richiestaOfferta.count({ where: { stato: 'nuova' } }),
    prisma.giornata.count({ where: { fase: 'fine', data: { gte: settimanaFa } } }),
    prisma.giornata.count({
      where: { fase: 'fine', data: { gte: settimanaFa }, rapportino: { isNot: null } },
    }),
    prisma.fatturaAttiva.count(),
    prisma.fatturaAttiva.count({ where: { stato: 'incassata' } }),
    prisma.commessa.findMany({
      where: { stato: 'aperta', preventivato: { gt: 0 } },
      select: { preventivato: true, costiMateriali: true, costiManodopera: true, costiMezzi: true },
    }),
    prisma.commessa.findMany({
      where: { stato: 'aperta' },
      include: { cliente: { select: { nome: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.commessa.findMany({
      where: { stato: 'aperta', archiviata: false, adempimenti: { some: { fatto: false } } },
      include: {
        cliente: { select: { nome: true } },
        _count: { select: { adempimenti: true } },
        adempimenti: { where: { fatto: true }, select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  // Margine medio commesse aperte
  const margini = commesseConMargine.map(c => {
    const costi = c.costiMateriali + c.costiManodopera + c.costiMezzi
    return ((c.preventivato - costi) / c.preventivato) * 100
  })
  const margineMedio = margini.length > 0
    ? Math.round(margini.reduce((a, b) => a + b, 0) / margini.length)
    : null

  const statoMargine = margineMedio === null ? null
    : margineMedio > 20 ? { label: 'Ottimo', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    : margineMedio > 5  ? { label: 'Nella norma', cls: 'text-blue-700 bg-blue-50 border-blue-200' }
    : margineMedio > 0  ? { label: 'Attenzione', cls: 'text-amber-700 bg-amber-50 border-amber-200' }
    : { label: 'Critico — costi superiori al preventivo', cls: 'text-red-700 bg-red-50 border-red-200' }

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-8">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 px-6 py-5 flex items-center justify-between gap-4 shadow-md">
        <div>
          <p className="text-slate-400 text-xs font-medium capitalize">{oggi}</p>
          <h1 className="text-xl font-bold text-white mt-0.5">Dashboard</h1>
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
              📬 {richiesteNuove} nuove richieste
            </Link>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Panoramica</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Cantieri aperti"
            value={commesseAperte}
            sub={`su ${commesseTotali} totali`}
            href="/impresa/commesse"
            variant="info"
          />
          <StatCard
            label="Rapportini"
            value={rapportiniMancanti > 0 ? rapportiniMancanti : '✓'}
            sub={rapportiniMancanti > 0 ? 'Mancanti — da gestire' : 'Tutto in regola'}
            href="/impresa/giornate"
            variant={rapportiniMancanti > 0 ? 'danger' : 'default'}
          />
          <StatCard
            label="Scadenze 30g"
            value={scadenzeVicine}
            sub={scadenzeVicine > 0 ? 'Fatture in scadenza' : 'Nessuna scadenza'}
            href="/impresa/scadenzario"
            variant={scadenzeVicine > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Ordini aperti"
            value={ordiniAperti}
            sub="Da fornitori"
            href="/impresa/ordini"
            variant="default"
          />
        </div>
      </div>

      {/* Sezione principale: grafici + cantieri */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Grafici */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Grafici</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">Salute dell&apos;impresa</p>
            </div>
            {statoMargine && (
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statoMargine.cls}`}>
                {statoMargine.label}
              </span>
            )}
          </div>

          {/* 3 ring charts */}
          <div className="grid grid-cols-3 gap-6">
            <RingChart
              value={commesseAperte}
              total={commesseTotali}
              label="Cantieri attivi"
              sub={`${commesseAperte} di ${commesseTotali}`}
              hex="#3b82f6"
            />
            <RingChart
              value={rapportiniOkSettimana}
              total={giornateChiuseSettimana || 1}
              label="Rapportini ok"
              sub="ultimi 7 giorni"
              hex="#10b981"
            />
            <RingChart
              value={fattureIncassate}
              total={fattureTotali || 1}
              label="Fatture incassate"
              sub={`${fattureIncassate} di ${fattureTotali}`}
              hex="#8b5cf6"
            />
          </div>

          {/* Margine medio */}
          {margineMedio !== null && (
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Margine medio</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Su {commesseConMargine.length} commess{commesseConMargine.length === 1 ? 'a con preventivo' : 'e con preventivo'}
                </p>
              </div>
              <p className={`text-3xl font-bold ${margineMedio > 10 ? 'text-emerald-600' : margineMedio > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {margineMedio > 0 ? '+' : ''}{margineMedio}%
              </p>
            </div>
          )}
        </div>

        {/* Cantieri attivi */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lista</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">Cantieri in corso</p>
            </div>
            <Link href="/impresa/commesse" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Vedi tutte →
            </Link>
          </div>

          {commesseRecenti.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-4xl mb-3">🏗️</p>
              <p className="text-sm font-semibold text-gray-600">Nessun cantiere aperto</p>
              <Link href="/impresa/preventivi/nuovo"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                + Crea il primo preventivo →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {commesseRecenti.map(c => {
                const costi = c.costiMateriali + c.costiManodopera + c.costiMezzi
                return (
                  <Link key={c.id} href={`/impresa/commesse/${c.id}`}
                    className="block py-3.5 group first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {c.nome}
                        </p>
                        {c.cliente && (
                          <p className="text-xs text-gray-400 mt-0.5">{c.cliente.nome}</p>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-500 shrink-0">{formatEuro(c.preventivato)}</p>
                    </div>
                    {c.preventivato > 0 && <BudgetBar costi={costi} preventivato={c.preventivato} />}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Adempimenti in sospeso */}
      {commesseAdempimenti.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adempimenti cantiere in sospeso</p>
          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {commesseAdempimenti.map(c => {
                const totale = c._count.adempimenti
                const fatti = c.adempimenti.length
                const mancanti = totale - fatti
                const pct = totale > 0 ? Math.round((fatti / totale) * 100) : 0
                return (
                  <Link key={c.id} href={`/impresa/commesse/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 truncate">{c.nome}</p>
                      {c.cliente && <p className="text-xs text-gray-400">{c.cliente.nome}</p>}
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="w-24">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{fatti}/{totale}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                        {mancanti} mancant{mancanti === 1 ? 'e' : 'i'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-right">
              <Link href="/impresa/commesse" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Vedi tutte le commesse →
              </Link>
            </div>
          </div>
        </div>
      )}

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
            🔔 Notifiche
          </Link>
        </div>
      </div>

    </div>
  )
}
