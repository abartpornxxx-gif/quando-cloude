import { requireImpresa } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { StatCard } from '@/components/ui/StatCard'
import {
  Building2,
  ClipboardList,
  CalendarClock,
  Boxes,
  AlertTriangle,
  MessageSquare,
  Bell,
} from 'lucide-react'

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
  const r = 42
  const strokeWidth = 7
  const circ = parseFloat((2 * Math.PI * r).toFixed(2))
  const dash = parseFloat(((pct / 100) * circ).toFixed(2))
  const gap = parseFloat((circ - dash).toFixed(2))

  return (
    <div className="flex flex-col items-center gap-3 group/ring">
      <div className="relative w-28 h-28 transition-transform duration-300 group-hover/ring:scale-105">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
          <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(15, 23, 42, 0.04)" strokeWidth={strokeWidth} />
          {pct > 0 && (
            <circle
              cx="56" cy="56" r={r} fill="none"
              stroke={hex} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-slate-700 tracking-wide uppercase">{label}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{sub}</p>
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
      where: { stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] }, dataScadenza: { lte: tra30, not: null } },
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
      <div className="rounded-2xl mesh-bg-impresa border border-slate-800 px-6 py-6 flex items-center justify-between gap-4 shadow-premium-lg">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider capitalize">{oggi}</p>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">Dashboard</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
          {rapportiniMancanti > 0 && (
            <Link href="/impresa/giornate"
              className="flex items-center gap-1.5 rounded-xl bg-red-500/20 border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-200 hover:bg-red-500/30 transition-all hover-lift active-press">
              <AlertTriangle size={13} className="shrink-0" />
              {rapportiniMancanti} rapportini mancanti
            </Link>
          )}
          {richiesteNuove > 0 && (
            <Link href="/impresa/richieste-offerte"
              className="flex items-center gap-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 px-3.5 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/30 transition-all hover-lift active-press">
              <MessageSquare size={13} className="shrink-0" />
              {richiesteNuove} nuove richieste
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
            icon={Building2}
          />
          <StatCard
            label="Rapportini"
            value={rapportiniMancanti > 0 ? rapportiniMancanti : '✓'}
            sub={rapportiniMancanti > 0 ? 'Mancanti — da gestire' : 'Tutto in regola'}
            href="/impresa/rapportini"
            variant={rapportiniMancanti > 0 ? 'danger' : 'success'}
            icon={ClipboardList}
          />
          <StatCard
            label="Scadenze 30g"
            value={scadenzeVicine}
            sub={scadenzeVicine > 0 ? 'Fatture in scadenza' : 'Nessuna scadenza'}
            href="/impresa/scadenzario"
            variant={scadenzeVicine > 0 ? 'warning' : 'default'}
            icon={CalendarClock}
          />
          <StatCard
            label="Ordini aperti"
            value={ordiniAperti}
            sub="Materiale da fornitori"
            href="/impresa/ordini"
            variant={ordiniAperti > 0 ? 'info' : 'default'}
            icon={Boxes}
          />
        </div>
      </div>

      {/* Sezione principale: grafici + cantieri */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Grafici */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white shadow-premium p-6 transition-all duration-300">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grafici</p>
              <p className="text-base font-extrabold text-gray-900 mt-0.5">Salute dell&apos;impresa</p>
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
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-premium p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lista</p>
              <p className="text-base font-extrabold text-gray-900 mt-0.5">Cantieri in corso</p>
            </div>
            <Link href="/impresa/commesse" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Vedi tutte →
            </Link>
          </div>

          {commesseRecenti.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Image src="/immagini/vuoto-cantieri.png" width={64} height={64} alt="" className="mb-3 opacity-70 mx-auto" />
              <p className="text-sm font-semibold text-gray-600">Nessun cantiere aperto</p>
              <Link href="/impresa/preventivi/nuovo"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                + Crea il primo preventivo →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/60">
              {commesseRecenti.map(c => {
                const costi = c.costiMateriali + c.costiManodopera + c.costiMezzi
                return (
                  <Link key={c.id} href={`/impresa/commesse/${c.id}`}
                    className="block py-3.5 px-2.5 -mx-2.5 hover-lift hover:bg-slate-50/50 rounded-xl transition-all group first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {c.nome}
                        </p>
                        {c.cliente && (
                          <p className="text-xs text-gray-400 mt-0.5">{c.cliente.nome}</p>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-600 shrink-0">{formatEuro(c.preventivato)}</p>
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
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Adempimenti cantiere in sospeso</p>
          <div className="rounded-2xl border border-amber-200 bg-white shadow-premium overflow-hidden transition-all duration-300">
            <div className="divide-y divide-gray-100">
              {commesseAdempimenti.map(c => {
                const totale = c._count.adempimenti
                const fatti = c.adempimenti.length
                const mancanti = totale - fatti
                const pct = totale > 0 ? Math.round((fatti / totale) * 100) : 0
                return (
                  <Link key={c.id} href={`/impresa/commesse/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group">
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
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">
                        {mancanti} mancant{mancanti === 1 ? 'e' : 'i'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-right">
              <Link href="/impresa/commesse" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                Vedi tutte le commesse →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Azioni rapide */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Azioni rapide</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/impresa/preventivi/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4.5 py-2.5 text-sm font-semibold text-white shadow-premium transition-all hover:bg-blue-700 hover-lift active-press">
            + Nuovo preventivo
          </Link>
          <Link href="/impresa/commesse/nuova"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4.5 py-2.5 text-sm font-bold text-slate-700 shadow-premium transition-all hover:bg-gray-50 hover-lift active-press">
            + Nuova commessa
          </Link>
          <Link href="/impresa/ordini/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4.5 py-2.5 text-sm font-bold text-slate-700 shadow-premium transition-all hover:bg-gray-50 hover-lift active-press">
            + Ordine fornitore
          </Link>
          <Link href="/impresa/notifiche"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4.5 py-2.5 text-sm font-bold text-slate-700 shadow-premium transition-all hover:bg-gray-50 hover-lift active-press">
            <Bell size={14} className="text-slate-500" />
            Notifiche
          </Link>
        </div>
      </div>

    </div>
  )
}
