import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

export default async function FatturePassivePage() {
  await requireImpresa()

  const fatture = await prisma.fatturaPassiva.findMany({
    include: {
      fornitore: { select: { nome: true } },
      commessa: { select: { nome: true } },
      ordine: { select: { id: true } },
    },
    orderBy: { data: 'desc' },
    take: 100,
  })

  const totaleDaPagare = fatture
    .filter(f => f.stato === 'da_pagare')
    .reduce((acc, f) => acc + f.importo, 0)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Fatture passive</h1>
        <Link
          href="/impresa/fatture-passive/nuova"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nuova
        </Link>
      </div>

      {totaleDaPagare > 0 && (
        <div className="mb-4 rounded-xl bg-orange-50 border border-orange-200 p-4">
          <p className="text-sm font-semibold text-orange-800">
            Totale da pagare: <span className="text-lg">{formatEuro(totaleDaPagare)}</span>
          </p>
        </div>
      )}

      {fatture.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna fattura passiva registrata.</p>
      )}

      <div className="bg-white rounded-xl border divide-y">
        {fatture.map(f => (
          <Link
            key={f.id}
            href={`/impresa/fatture-passive/${f.id}`}
            className="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">
                  {f.fornitore?.nome ?? 'Fornitore n.d.'}
                  {f.numero ? ` — n. ${f.numero}` : ''}
                </p>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${f.stato === 'pagata' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {f.stato === 'pagata' ? 'Pagata' : 'Da pagare'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {f.commessa?.nome ? `Commessa: ${f.commessa.nome}` : ''}
                {f.ordine ? ' · collegata a ordine' : ''}
              </p>
              <p className="text-xs text-gray-400">
                Data: {formatData(f.data)}
                {f.dataScadenza ? ` · Scadenza: ${formatData(f.dataScadenza)}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="font-semibold">{formatEuro(f.importo)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
