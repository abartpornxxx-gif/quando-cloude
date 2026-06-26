import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import RegistraIncassoForm from '@/app/impresa/fatture/[id]/RegistraIncassoForm'
import { eliminaFatturaAttivaUfficio, segnaScadutaUfficio } from '../actions'

const BADGE: Record<string, string> = {
  da_incassare: 'bg-yellow-100 text-yellow-800',
  parzialmente_incassata: 'bg-amber-100 text-amber-800',
  incassata: 'bg-green-100 text-green-800',
  scaduta: 'bg-red-100 text-red-800',
}
const LABEL: Record<string, string> = {
  da_incassare: 'Da incassare',
  parzialmente_incassata: 'Parz. incassata',
  incassata: 'Incassata',
  scaduta: 'Scaduta',
}

export default async function FatturaUfficioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUfficio()
  const { id } = await params

  const fattura = await prisma.fatturaAttiva.findUnique({
    where: { id },
    include: { cliente: true, commessa: { select: { id: true, nome: true } }, righe: { orderBy: { ordine: 'asc' } } },
  })
  if (!fattura) notFound()

  const imponibile = fattura.righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
  const iva = Math.round(imponibile * fattura.aliquotaIva / 100)
  const totale = imponibile + iva
  const giaIncassato = fattura.importoIncassato ?? 0
  const residuo = totale - giaIncassato
  const isParziale = fattura.stato === 'parzialmente_incassata'
  const canRegisterIncasso = fattura.stato === 'da_incassare' || isParziale

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/ufficio/fatture" className="text-teal-600 hover:text-teal-800 text-sm">‹ Fatture</Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Fattura n. {fattura.numero}/{fattura.anno}</h1>
        <span className={`text-xs rounded-full px-3 py-1 font-semibold ${BADGE[fattura.stato]}`}>{LABEL[fattura.stato]}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Cliente</p>
            <p className="font-medium">{fattura.cliente?.nome ?? '—'}</p>
            {fattura.cliente?.indirizzo && <p className="text-xs text-gray-400">{fattura.cliente.indirizzo}</p>}
            {fattura.cliente?.partitaIva && <p className="text-xs text-gray-400">P.IVA: {fattura.cliente.partitaIva}</p>}
          </div>
          <div className="space-y-1">
            <div>
              <p className="text-gray-500 text-xs">Data emissione</p>
              <p className="font-medium">{formatData(fattura.data)}</p>
            </div>
            {fattura.dataScadenza && (
              <div>
                <p className="text-gray-500 text-xs">Scadenza</p>
                <p className={`font-medium ${new Date(fattura.dataScadenza) < new Date() && fattura.stato === 'da_incassare' ? 'text-red-600' : ''}`}>
                  {formatData(fattura.dataScadenza)}
                </p>
              </div>
            )}
            {fattura.commessa && (
              <div>
                <p className="text-gray-500 text-xs">Commessa</p>
                <Link href={`/ufficio/commesse/${fattura.commessa.id}`} className="font-medium text-teal-600 hover:underline">
                  {fattura.commessa.nome}
                </Link>
              </div>
            )}
          </div>
        </div>
        {fattura.note && <p className="text-sm text-gray-600 border-t pt-3">Note: {fattura.note}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Descrizione</th>
              <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Qtà</th>
              <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Prezzo unit.</th>
              <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">Totale</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fattura.righe.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.descrizione}</td>
                <td className="px-4 py-3 text-right text-gray-600">{r.quantita}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatEuro(r.prezzoUnitario)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatEuro(Math.round(r.quantita * r.prezzoUnitario))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Imponibile</td>
              <td className="px-4 py-2 text-right font-semibold">{formatEuro(imponibile)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">IVA {fattura.aliquotaIva}%</td>
              <td className="px-4 py-2 text-right font-semibold">{formatEuro(iva)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right font-bold">Totale</td>
              <td className="px-4 py-2 text-right font-bold text-lg">{formatEuro(totale)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Stato incasso — parziale */}
      {isParziale && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="text-amber-800 font-semibold">⏳ Incasso parziale in corso</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Totale fattura</p>
              <p className="font-bold text-gray-900">{formatEuro(totale)}</p>
            </div>
            <div>
              <p className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Già incassato</p>
              <p className="font-bold text-green-700">{formatEuro(giaIncassato)}</p>
            </div>
            <div>
              <p className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Residuo</p>
              <p className="font-bold text-red-600">{formatEuro(residuo)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stato incasso — completo */}
      {fattura.stato === 'incassata' && fattura.dataIncasso && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-green-800 font-semibold">✓ Incassata il {formatData(fattura.dataIncasso)}</p>
          {fattura.importoIncassato && (
            <p className="text-green-700 text-sm">Importo ricevuto: {formatEuro(fattura.importoIncassato)}</p>
          )}
        </div>
      )}

      {canRegisterIncasso && (
        <RegistraIncassoForm fatturaId={fattura.id} totaleFattura={totale} giaIncassato={giaIncassato} />
      )}

      <div className="flex flex-wrap gap-3">
        {fattura.stato === 'da_incassare' && fattura.dataScadenza && new Date(fattura.dataScadenza) < new Date() && (
          <form action={segnaScadutaUfficio.bind(null, fattura.id)}>
            <button type="submit" className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100">
              Segna come scaduta
            </button>
          </form>
        )}
        {(fattura.stato === 'da_incassare' || fattura.stato === 'scaduta') && (
          <form action={eliminaFatturaAttivaUfficio.bind(null, fattura.id)}>
            <button type="submit" className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              Elimina
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
