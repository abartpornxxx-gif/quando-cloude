import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

export default async function ScadenzarioPage() {
  await requireImpresa()

  const now = new Date()
  const oggiUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const tra30Utc = oggiUtc + 30 * 86_400_000

  function dataUtcMs(d: Date): number {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  }

  const [attive, passive, mezziRaw] = await Promise.all([
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
    prisma.mezzo.findMany({
      where: {
        OR: [
          { scadenzaBollo: { not: null } },
          { scadenzaRevisione: { not: null } },
          { scadenzaAssicurazione: { not: null } },
        ],
      },
      select: {
        id: true,
        nome: true,
        targa: true,
        scadenzaBollo: true,
        scadenzaRevisione: true,
        scadenzaAssicurazione: true,
      },
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

  type VoceMezzo = {
    id: string
    descrizione: string
    scadenza: Date
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
          href: `/impresa/fatture/${f.id}`,
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
          href: `/impresa/fatture-passive/${f.id}`,
        }
      }),
  ].sort((a, b) => dataUtcMs(a.scadenza) - dataUtcMs(b.scadenza))

  // Scadenze mezzi (bollo, revisione, assicurazione)
  const vociMezzi: VoceMezzo[] = []
  for (const m of mezziRaw) {
    const label = m.targa ? `${m.nome} (${m.targa})` : m.nome
    if (m.scadenzaBollo) {
      vociMezzi.push({
        id: `${m.id}-bollo`,
        descrizione: `🚗 Bollo — ${label}`,
        scadenza: m.scadenzaBollo,
        ...classificaData(m.scadenzaBollo),
        href: `/impresa/mezzi`,
      })
    }
    if (m.scadenzaRevisione) {
      vociMezzi.push({
        id: `${m.id}-revisione`,
        descrizione: `🔧 Revisione — ${label}`,
        scadenza: m.scadenzaRevisione,
        ...classificaData(m.scadenzaRevisione),
        href: `/impresa/mezzi`,
      })
    }
    if (m.scadenzaAssicurazione) {
      vociMezzi.push({
        id: `${m.id}-assicurazione`,
        descrizione: `🛡 Assicurazione — ${label}`,
        scadenza: m.scadenzaAssicurazione,
        ...classificaData(m.scadenzaAssicurazione),
        href: `/impresa/mezzi`,
      })
    }
  }
  vociMezzi.sort((a, b) => dataUtcMs(a.scadenza) - dataUtcMs(b.scadenza))

  const scadute    = voci.filter(v => v.scaduta)
  const oggiVoci   = voci.filter(v => v.oggi)
  const inScadenza = voci.filter(v => v.inScadenza)
  const future     = voci.filter(v => !v.scaduta && !v.oggi && !v.inScadenza)

  const mezziScaduti    = vociMezzi.filter(v => v.scaduta)
  const mezziOggi       = vociMezzi.filter(v => v.oggi)
  const mezziInScadenza = vociMezzi.filter(v => v.inScadenza)
  const mezziFuturi     = vociMezzi.filter(v => !v.scaduta && !v.oggi && !v.inScadenza)

  function VoceRow({ v }: { v: Voce }) {
    return (
      <Link href={v.href} className="flex items-center justify-between p-4 hover:bg-gray-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${v.tipo === 'attiva' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
              {v.tipo === 'attiva' ? '▲ Attiva' : '▼ Passiva'}
            </span>
            <p className="text-sm font-medium truncate">{v.descrizione}</p>
          </div>
          <p className={`text-xs mt-0.5 ${v.scaduta ? 'text-red-500 font-medium' : v.oggi ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
            Scadenza: {formatData(v.scadenza)}
            {v.scaduta ? ' — SCADUTA' : v.oggi ? ' — OGGI' : ''}
          </p>
        </div>
        <p className={`text-sm font-semibold ml-4 shrink-0 ${v.tipo === 'attiva' ? 'text-green-700' : 'text-orange-700'}`}>
          {v.tipo === 'attiva' ? '+' : '−'} {formatEuro(v.importo)}
        </p>
      </Link>
    )
  }

  function VoceMezzoRow({ v }: { v: VoceMezzo }) {
    return (
      <Link href={v.href} className="flex items-center justify-between p-4 hover:bg-gray-50">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{v.descrizione}</p>
          <p className={`text-xs mt-0.5 ${v.scaduta ? 'text-red-500 font-medium' : v.oggi ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
            Scadenza: {formatData(v.scadenza)}
            {v.scaduta ? ' — SCADUTA' : v.oggi ? ' — OGGI' : ''}
          </p>
        </div>
        <span className="ml-4 shrink-0 text-xs rounded-full px-2 py-0.5 font-medium bg-amber-100 text-amber-800">
          Veicolo
        </span>
      </Link>
    )
  }

  function Sezione({ titolo, items, colore }: { titolo: string; items: Voce[]; colore: string }) {
    if (items.length === 0) return null
    return (
      <div className="mb-6">
        <h2 className={`text-sm font-semibold mb-2 ${colore}`}>{titolo} ({items.length})</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {items.map(v => <VoceRow key={v.id} v={v} />)}
        </div>
      </div>
    )
  }

  function SezioneMezzi({ titolo, items, colore }: { titolo: string; items: VoceMezzo[]; colore: string }) {
    if (items.length === 0) return null
    return (
      <div className="mb-4">
        <h3 className={`text-xs font-semibold mb-2 ${colore}`}>{titolo} ({items.length})</h3>
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm divide-y divide-amber-50">
          {items.map(v => <VoceMezzoRow key={v.id} v={v} />)}
        </div>
      </div>
    )
  }

  const totDaIncassare = attive.reduce((acc, f) => acc + (totaleAttiva(f.righe, f.aliquotaIva) - (f.importoIncassato ?? 0)), 0)
  const totDaPagare    = passive.reduce((acc, f) => acc + f.importo, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scadenzario</h1>
        <p className="mt-1 text-sm text-gray-500">Fatture, pagamenti e scadenze veicoli</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Da incassare</p>
          <p className="text-xl font-bold text-green-800 mt-1">{formatEuro(totDaIncassare)}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Da pagare</p>
          <p className="text-xl font-bold text-orange-800 mt-1">{formatEuro(totDaPagare)}</p>
        </div>
      </div>

      {voci.length === 0 && vociMezzi.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna scadenza aperta. Ottimo!</p>
      )}

      <Sezione titolo="Scadute" items={scadute} colore="text-red-700" />
      <Sezione titolo="In scadenza oggi" items={oggiVoci} colore="text-orange-600" />
      <Sezione titolo="Entro 30 giorni" items={inScadenza} colore="text-amber-700" />
      <Sezione titolo="Oltre 30 giorni" items={future} colore="text-gray-600" />

      {/* Scadenze veicoli */}
      {vociMezzi.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🚗 Scadenze veicoli
            <span className="text-xs font-normal text-gray-400">bollo · revisione · assicurazione</span>
          </h2>
          <div className="space-y-3">
            <SezioneMezzi titolo="Scadute" items={mezziScaduti} colore="text-red-700" />
            <SezioneMezzi titolo="Oggi" items={mezziOggi} colore="text-orange-600" />
            <SezioneMezzi titolo="Entro 30 giorni" items={mezziInScadenza} colore="text-amber-700" />
            <SezioneMezzi titolo="Oltre 30 giorni" items={mezziFuturi} colore="text-gray-600" />
          </div>
        </div>
      )}
    </div>
  )
}
