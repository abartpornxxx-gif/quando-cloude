import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import RegistraPagamentoForm from '@/app/impresa/fatture-passive/[id]/RegistraPagamentoForm'
import {
  eliminaFatturaPassivaUfficio,
  toggleControllata,
  aggiornaNoteUfficio,
  annullaPagamento,
} from '../actions'

export default async function FatturaPassivaUfficioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUfficio()
  const { id } = await params

  const fattura = await prisma.fatturaPassiva.findUnique({
    where: { id },
    include: {
      fornitore: true,
      commessa: { select: { id: true, nome: true } },
      ordine: { select: { id: true } },
    },
  })
  if (!fattura) notFound()

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const isScaduta = fattura.dataScadenza && new Date(fattura.dataScadenza) < oggi && fattura.stato === 'da_pagare'

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/ufficio/fatture-passive" className="text-teal-600 hover:text-teal-800 text-sm">
          ‹ Fatture passive
        </Link>
        <h1 className="text-xl font-bold flex-1">
          {fattura.fornitore?.nome ?? 'Fornitore'}{fattura.numero ? ` — n. ${fattura.numero}` : ''}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs rounded-full px-3 py-1 font-semibold ${
            fattura.stato === 'pagata' ? 'bg-green-100 text-green-800'
            : isScaduta ? 'bg-red-100 text-red-800'
            : 'bg-orange-100 text-orange-800'
          }`}>
            {fattura.stato === 'pagata' ? 'Pagata' : isScaduta ? 'Scaduta' : 'Da pagare'}
          </span>
          {fattura.controllata && (
            <span className="text-xs rounded-full px-3 py-1 font-semibold bg-blue-100 text-blue-800">
              ✓ Controllata
            </span>
          )}
        </div>
      </div>

      {/* Dati fattura */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs">Fornitore</p>
            <p className="font-medium">{fattura.fornitore?.nome ?? '—'}</p>
            {fattura.fornitore?.partitaIva && (
              <p className="text-xs text-gray-400">P.IVA: {fattura.fornitore.partitaIva}</p>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-gray-500 text-xs">Data fattura</p>
              <p className="font-medium">{formatData(fattura.data)}</p>
            </div>
            {fattura.dataScadenza && (
              <div>
                <p className="text-gray-500 text-xs">Scadenza</p>
                <p className={`font-medium ${isScaduta ? 'text-red-600' : ''}`}>
                  {formatData(fattura.dataScadenza)}
                </p>
              </div>
            )}
          </div>
        </div>

        {fattura.commessa && (
          <div className="border-t pt-3">
            <p className="text-gray-500 text-xs">Commessa</p>
            <Link href={`/ufficio/commesse/${fattura.commessa.id}`}
              className="font-medium text-teal-600 hover:underline">
              {fattura.commessa.nome}
            </Link>
          </div>
        )}
        {fattura.ordine && (
          <div>
            <p className="text-gray-500 text-xs">Ordine collegato</p>
            <Link href={`/ufficio/ordini/${fattura.ordine.id}`}
              className="font-medium text-teal-600 hover:underline">
              Vai all&apos;ordine
            </Link>
          </div>
        )}

        <div className="border-t pt-3">
          <p className="text-gray-500 text-xs">Importo totale (IVA inclusa)</p>
          <p className="text-2xl font-bold">{formatEuro(fattura.importo)}</p>
        </div>
      </div>

      {/* Stato pagamento */}
      {fattura.stato === 'pagata' && fattura.dataPagamento && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2">
          <p className="text-green-800 font-semibold">✓ Pagata il {formatData(fattura.dataPagamento)}</p>
          {fattura.importoPagato && (
            <p className="text-green-700 text-sm">Importo pagato: {formatEuro(fattura.importoPagato)}</p>
          )}
          <form action={annullaPagamento.bind(null, fattura.id)} className="pt-1">
            <button type="submit"
              className="text-xs rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-orange-700 hover:bg-orange-100 font-medium">
              Annulla pagamento (segna come da pagare)
            </button>
          </form>
        </div>
      )}

      {fattura.stato === 'da_pagare' && (
        <RegistraPagamentoForm fatturaId={fattura.id} importoFattura={fattura.importo} />
      )}

      {/* Azioni rapide */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Azioni rapide</p>

        {/* Toggle controllata */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Controllata</p>
            <p className="text-xs text-gray-500">Segna se la fattura è stata verificata e approvata</p>
          </div>
          <form action={toggleControllata.bind(null, fattura.id, !fattura.controllata)}>
            <button type="submit"
              className={`rounded-xl px-4 py-2 text-sm font-semibold border transition-colors ${
                fattura.controllata
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}>
              {fattura.controllata ? '✓ Controllata' : 'Segna controllata'}
            </button>
          </form>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Note</p>
        <form action={aggiornaNoteUfficio.bind(null, fattura.id)} className="space-y-3">
          <textarea
            name="note"
            defaultValue={fattura.note ?? ''}
            rows={3}
            placeholder="Note interne sulla fattura (opzionale)…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          <button type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Salva note
          </button>
        </form>
      </div>

      {/* Elimina */}
      {fattura.stato !== 'pagata' && (
        <form action={eliminaFatturaPassivaUfficio.bind(null, fattura.id)}>
          <button type="submit"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            Elimina fattura
          </button>
        </form>
      )}
    </div>
  )
}
