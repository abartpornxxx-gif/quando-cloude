import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function UfficioFatturePassivePage() {
  await requireUfficio()

  const fatture = await prisma.fatturaPassiva.findMany({
    include: { fornitore: { select: { nome: true } }, commessa: { select: { nome: true } }, ordine: { select: { id: true } } },
    orderBy: { data: 'desc' },
  })

  const totaleDaPagare = fatture.filter(f => f.stato === 'da_pagare').reduce((acc, f) => acc + f.importo, 0)

  return (
    <div>
      <PageHeader
        title="Fatture passive"
        subtitle={`${fatture.length} ${fatture.length === 1 ? 'fattura' : 'fatture'} fornitori`}
        action={<Link href="/ufficio/fatture-passive/nuova" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuova</Link>}
      />

      {totaleDaPagare > 0 && (
        <div className="mb-6 rounded-2xl bg-orange-50 border border-orange-200 px-5 py-4">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Totale da pagare</p>
          <p className="text-2xl font-bold text-orange-900 mt-0.5">{formatEuro(totaleDaPagare)}</p>
        </div>
      )}

      {fatture.length === 0 ? (
        <EmptyState title="Nessuna fattura fornitore" description="Registra la prima fattura ricevuta da un fornitore."
          action={<Link href="/ufficio/fatture-passive/nuova" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuova</Link>} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {fatture.map(f => (
              <Link key={f.id} href={`/ufficio/fatture-passive/${f.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-teal-700 transition-colors">
                      {f.fornitore?.nome ?? 'Fornitore n.d.'}{f.numero ? ` — n. ${f.numero}` : ''}
                    </p>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${f.stato === 'pagata' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {f.stato === 'pagata' ? 'Pagata' : 'Da pagare'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {f.commessa?.nome ? `Commessa: ${f.commessa.nome}` : ''}
                    {f.ordine ? ' · collegata a ordine' : ''}
                  </p>
                  <p className="text-xs text-gray-400">Data: {formatData(f.data)}{f.dataScadenza ? ` · Scadenza: ${formatData(f.dataScadenza)}` : ''}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-semibold text-gray-900">{formatEuro(f.importo)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
