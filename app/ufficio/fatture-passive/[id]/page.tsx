import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import RegistraPagamentoForm from '@/app/impresa/fatture-passive/[id]/RegistraPagamentoForm'
import { eliminaFatturaPassivaUfficio } from '../actions'

export default async function FatturaPassivaUfficioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUfficio()
  const { id } = await params

  const fattura = await prisma.fatturaPassiva.findUnique({
    where: { id },
    include: { fornitore: true, commessa: { select: { id: true, nome: true } }, ordine: { select: { id: true } } },
  })
  if (!fattura) notFound()

  const isScaduta = fattura.dataScadenza && new Date(fattura.dataScadenza) < new Date() && fattura.stato === 'da_pagare'

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/ufficio/fatture-passive" className="text-teal-600 hover:text-teal-800 text-sm">‹ Fatture passive</Link>
        <h1 className="text-xl font-bold flex-1">
          Fattura {fattura.fornitore?.nome ?? 'Fornitore'}{fattura.numero ? ` — n. ${fattura.numero}` : ''}
        </h1>
        <span className={`text-xs rounded-full px-3 py-1 font-semibold ${fattura.stato === 'pagata' ? 'bg-green-100 text-green-800' : isScaduta ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
          {fattura.stato === 'pagata' ? 'Pagata' : isScaduta ? 'Scaduta' : 'Da pagare'}
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs">Fornitore</p>
            <p className="font-medium">{fattura.fornitore?.nome ?? '—'}</p>
            {fattura.fornitore?.partitaIva && <p className="text-xs text-gray-400">P.IVA: {fattura.fornitore.partitaIva}</p>}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-gray-500 text-xs">Data fattura</p>
              <p className="font-medium">{formatData(fattura.data)}</p>
            </div>
            {fattura.dataScadenza && (
              <div>
                <p className="text-gray-500 text-xs">Scadenza</p>
                <p className={`font-medium ${isScaduta ? 'text-red-600' : ''}`}>{formatData(fattura.dataScadenza)}</p>
              </div>
            )}
          </div>
        </div>

        {fattura.commessa && (
          <div className="border-t pt-3">
            <p className="text-gray-500 text-xs">Commessa</p>
            <p className="font-medium text-gray-700">{fattura.commessa.nome}</p>
          </div>
        )}
        {fattura.ordine && (
          <div>
            <p className="text-gray-500 text-xs">Ordine collegato</p>
            <Link href={`/ufficio/ordini/${fattura.ordine.id}`} className="font-medium text-teal-600 hover:underline">Vai all&apos;ordine</Link>
          </div>
        )}

        <div className="border-t pt-3">
          <p className="text-gray-500 text-xs">Importo totale (IVA inclusa)</p>
          <p className="text-2xl font-bold">{formatEuro(fattura.importo)}</p>
        </div>

        {fattura.note && <p className="text-gray-600 border-t pt-3">Note: {fattura.note}</p>}
      </div>

      {fattura.stato === 'pagata' && fattura.dataPagamento && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-green-800 font-semibold">✓ Pagata il {formatData(fattura.dataPagamento)}</p>
          {fattura.importoPagato && <p className="text-green-700 text-sm">Importo pagato: {formatEuro(fattura.importoPagato)}</p>}
        </div>
      )}

      {fattura.stato === 'da_pagare' && (
        <RegistraPagamentoForm fatturaId={fattura.id} importoFattura={fattura.importo} />
      )}

      {fattura.stato !== 'pagata' && (
        <form action={eliminaFatturaPassivaUfficio.bind(null, fattura.id)}>
          <button type="submit" className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            Elimina
          </button>
        </form>
      )}
    </div>
  )
}
