import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

export default async function UfficioScadenzarioPage() {
  await requireUfficio()

  const now = new Date()
  const oggiUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const tra30Utc = oggiUtc + 30 * 86_400_000

  function dataUtcMs(d: Date): number {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  }

  const [attive, passive] = await Promise.all([
    prisma.fatturaAttiva.findMany({
      where: {
        stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] },
        dataScadenza: { not: null },
      },
      include: {
        cliente: { select: { nome: true } },
        righe: true,
      },
      orderBy: { dataScadenza: 'asc' },
    }),
    prisma.fatturaPassiva.findMany({
      where: {
        stato: 'da_pagare',
        dataScadenza: { not: null },
      },
      include: {
        fornitore: { select: { nome: true } },
      },
      orderBy: { dataScadenza: 'asc' },
    }),
  ])

  type Voce = {
    id: string
    tipo: 'attiva' | 'passiva'
    descrizione: string
    scadenza: Date
    importo: number
    scaduta: boolean
    oggi: boolean
    inScadenza: boolean
    href: string
  }

  function totaleAttiva(righe: { quantita: number; prezzoUnitario: number }[], iva: number) {
    const imp = righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
    return imp + Math.round(imp * iva / 100)
  }

  function classificaData(d: Date): { scaduta: boolean; oggi: boolean; inScadenza: boolean } {
    const dUtc = dataUtcMs(d)
    return {
      scaduta:    dUtc < oggiUtc,
      oggi:       dUtc === oggiUtc,
      inScadenza: dUtc > oggiUtc && dUtc <= tra30Utc,
    }
  }

  const voci: Voce[] = [
    ...attive
      .filter(f => f.dataScadenza)
      .map(f => {
        const cl = classificaData(f.dataScadenza!)
        const totFattura = totaleAttiva(f.righe, f.aliquotaIva)
        const residuo = totFattura - (f.importoIncassato ?? 0)
        const isParziale = f.stato === 'parzialmente_incassata'
        return {
          id: f.id,
          tipo: 'attiva' as const,
          descrizione: `${isParziale ? 'Parz. incassata' : 'Da incassare'}: ${f.cliente?.nome ?? '?'} — n. ${f.numero}/${f.anno}`,
          scadenza: f.dataScadenza!,
          importo: residuo,
          ...cl,
          href: `/ufficio/fatture/${f.id}`,
        }
      }),
    ...passive
      .filter(f => f.dataScadenza)
      .map(f => {
        const cl = classificaData(f.dataScadenza!)
        return {
          id: f.id,
          tipo: 'passiva' as const,
          descrizione: `Da pagare: ${f.fornitore?.nome ?? '?'}${f.numero ? ` — n. ${f.numero}` : ''}`,
          scadenza: f.dataScadenza!,
          importo: f.importo,
          ...cl,
          href: `/ufficio/fatture-passive/${f.id}`,
        }
      }),
  ].sort((a, b) => dataUtcMs(a.scadenza) - dataUtcMs(b.scadenza))

  const scadute    = voci.filter(v => v.scaduta)
  const oggiVoci   = voci.filter(v => v.oggi)
  const inScadenza = voci.filter(v => v.inScadenza)
  const future     = voci.filter(v => !v.scaduta && !v.oggi && !v.inScadenza)

  function VoceRow({ v }: { v: Voce }) {
    return (
      <Link href={v.href} className="flex items-center justify-between p-4 hover:bg-gray-50/70 transition-colors group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
              v.tipo === 'attiva' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-850'
            }`}>
              {v.tipo === 'attiva' ? '▲ Credito' : '▼ Debito'}
            </span>
            <p className="text-sm font-semibold truncate text-gray-900 group-hover:text-teal-700">{v.descrizione}</p>
          </div>
          <p className={`text-xs mt-0.5 ${v.scaduta ? 'text-red-500 font-medium' : v.oggi ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
            Scadenza: {formatData(v.scadenza)}
            {v.scaduta ? ' — SCADUTA' : v.oggi ? ' — OGGI' : ''}
          </p>
        </div>
        <p className={`text-sm font-bold ml-4 shrink-0 ${v.tipo === 'attiva' ? 'text-green-700' : 'text-orange-700'}`}>
          {v.tipo === 'attiva' ? '+' : '−'} {formatEuro(v.importo)}
        </p>
      </Link>
    )
  }

  function Sezione({ titolo, items, colore }: { titolo: string; items: Voce[]; colore: string }) {
    if (items.length === 0) return null
    return (
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{titolo} ({items.length})</p>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
          {items.map(v => <VoceRow key={v.id} v={v} />)}
        </div>
      </div>
    )
  }

  const totDaIncassare = attive.reduce((acc, f) => acc + (totaleAttiva(f.righe, f.aliquotaIva) - (f.importoIncassato ?? 0)), 0)
  const totDaPagare    = passive.reduce((acc, f) => acc + f.importo, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Intestazione */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scadenzario Scadenze</h1>
        <p className="mt-1 text-sm text-gray-500">Monitoraggio dei crediti attivi e debiti verso i fornitori dell'ufficio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Da incassare (Crediti)</p>
          <p className="text-xl font-black text-blue-800 mt-1">{formatEuro(totDaIncassare)}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Da pagare (Debiti)</p>
          <p className="text-xl font-black text-orange-850 mt-1">{formatEuro(totDaPagare)}</p>
        </div>
      </div>

      {voci.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <p className="text-sm text-gray-400">Nessuna scadenza programmata registrata.</p>
        </div>
      )}

      <Sezione titolo="Scadute" items={scadute} colore="text-red-700" />
      <Sezione titolo="In scadenza oggi" items={oggiVoci} colore="text-orange-600" />
      <Sezione titolo="Entro 30 giorni" items={inScadenza} colore="text-amber-700" />
      <Sezione titolo="Oltre 30 giorni" items={future} colore="text-gray-600" />
    </div>
  )
}
