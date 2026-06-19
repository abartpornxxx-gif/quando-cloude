import { requireImpresa } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

export default async function ScadenzarioPage() {
  await requireImpresa()

  const oggi = new Date()
  const tra30 = new Date(oggi)
  tra30.setDate(tra30.getDate() + 30)

  const [attive, passive] = await Promise.all([
    prisma.fatturaAttiva.findMany({
      where: {
        stato: { in: ['da_incassare', 'scaduta'] },
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
    inScadenza: boolean
    href: string
  }

  function totaleAttiva(righe: { quantita: number; prezzoUnitario: number; }[], iva: number) {
    const imp = righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
    return imp + Math.round(imp * iva / 100)
  }

  const voci: Voce[] = [
    ...attive
      .filter(f => f.dataScadenza)
      .map(f => ({
        id: f.id,
        tipo: 'attiva' as const,
        descrizione: `Da incassare: ${f.cliente?.nome ?? '?'} — n. ${f.numero}/${f.anno}`,
        scadenza: new Date(f.dataScadenza!),
        importo: totaleAttiva(f.righe, f.aliquotaIva),
        scaduta: new Date(f.dataScadenza!) < oggi,
        inScadenza: new Date(f.dataScadenza!) >= oggi && new Date(f.dataScadenza!) <= tra30,
        href: `/impresa/fatture/${f.id}`,
      })),
    ...passive
      .filter(f => f.dataScadenza)
      .map(f => ({
        id: f.id,
        tipo: 'passiva' as const,
        descrizione: `Da pagare: ${f.fornitore?.nome ?? '?'}${f.numero ? ` — n. ${f.numero}` : ''}`,
        scadenza: new Date(f.dataScadenza!),
        importo: f.importo,
        scaduta: new Date(f.dataScadenza!) < oggi,
        inScadenza: new Date(f.dataScadenza!) >= oggi && new Date(f.dataScadenza!) <= tra30,
        href: `/impresa/fatture-passive/${f.id}`,
      })),
  ].sort((a, b) => a.scadenza.getTime() - b.scadenza.getTime())

  const scadute = voci.filter(v => v.scaduta)
  const inScadenza = voci.filter(v => !v.scaduta && v.inScadenza)
  const future = voci.filter(v => !v.scaduta && !v.inScadenza)

  function Sezione({ titolo, items, colore }: { titolo: string; items: Voce[]; colore: string }) {
    if (items.length === 0) return null
    return (
      <div className="mb-6">
        <h2 className={`text-sm font-semibold mb-2 ${colore}`}>{titolo} ({items.length})</h2>
        <div className="bg-white rounded-xl border divide-y">
          {items.map(v => (
            <Link key={v.id} href={v.href} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${v.tipo === 'attiva' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                    {v.tipo === 'attiva' ? '▲ Attiva' : '▼ Passiva'}
                  </span>
                  <p className="text-sm font-medium truncate">{v.descrizione}</p>
                </div>
                <p className={`text-xs mt-0.5 ${v.scaduta ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  Scadenza: {formatData(v.scadenza)}
                  {v.scaduta ? ' — SCADUTA' : ''}
                </p>
              </div>
              <p className={`text-sm font-semibold ml-4 shrink-0 ${v.tipo === 'attiva' ? 'text-green-700' : 'text-orange-700'}`}>
                {v.tipo === 'attiva' ? '+' : '−'} {formatEuro(v.importo)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const totDaIncassare = attive.reduce((acc, f) => acc + totaleAttiva(f.righe, f.aliquotaIva), 0)
  const totDaPagare = passive.reduce((acc, f) => acc + f.importo, 0)

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Scadenzario</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-xs text-green-600 font-medium">Totale da incassare</p>
          <p className="text-xl font-bold text-green-800">{formatEuro(totDaIncassare)}</p>
        </div>
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
          <p className="text-xs text-orange-600 font-medium">Totale da pagare</p>
          <p className="text-xl font-bold text-orange-800">{formatEuro(totDaPagare)}</p>
        </div>
      </div>

      {voci.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna scadenza aperta. Ottimo!</p>
      )}

      <Sezione titolo="Scadute" items={scadute} colore="text-red-700" />
      <Sezione titolo="In scadenza (prossimi 30 giorni)" items={inScadenza} colore="text-orange-700" />
      <Sezione titolo="Future" items={future} colore="text-gray-700" />
    </div>
  )
}
