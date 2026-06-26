import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import StatoOrdineControlUfficio from './StatoOrdineControlUfficio'

const STATO_LABEL: Record<string, string> = { richiesto: 'Da ordinare', ordinato: 'Ordinato', consegnato: 'Consegnato', usato: 'Usato' }
const STATO_COLOR: Record<string, string> = {
  richiesto: 'bg-gray-100 text-gray-700', ordinato: 'bg-yellow-100 text-yellow-700',
  consegnato: 'bg-green-100 text-green-700', usato: 'bg-teal-100 text-teal-700',
}

export default async function OrdineUfficioDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUfficio()
  const { id } = await params

  const ordine = await prisma.ordineFornitore.findUnique({
    where: { id },
    include: {
      fornitore: { select: { nome: true, email: true, telefono: true } },
      commessa: { select: { id: true, nome: true } },
      righe: { include: { materiale: { select: { codice: true, unita: true } } }, orderBy: { id: 'asc' } },
    },
  })
  if (!ordine) notFound()

  const totale = ordine.righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ufficio/ordini" className="text-sm text-gray-500 hover:text-gray-700">← Ordini</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Ordine {formatData(ordine.createdAt)}</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900 text-lg">{ordine.fornitore?.nome ?? 'Fornitore non specificato'}</p>
            {ordine.fornitore?.email && <p className="text-sm text-gray-500">{ordine.fornitore.email}</p>}
            {ordine.fornitore?.telefono && <p className="text-sm text-gray-500">{ordine.fornitore.telefono}</p>}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${STATO_COLOR[ordine.stato]}`}>
            {STATO_LABEL[ordine.stato]}
          </span>
        </div>
        {ordine.commessa && (
          <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2 text-sm">
            Commessa: <span className="font-semibold text-teal-700">{ordine.commessa.nome}</span>
          </div>
        )}
        {ordine.note && <p className="text-sm text-gray-500 italic">{ordine.note}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Righe ordine</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Descrizione</th>
              <th className="px-4 py-2 text-right">Qtà</th>
              <th className="px-4 py-2 text-right">Prezzo un.</th>
              <th className="px-4 py-2 text-right">Totale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ordine.righe.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{r.descrizione}</p>
                  {r.materiale?.codice && <p className="text-xs text-gray-400">Cod. {r.materiale.codice}</p>}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{r.quantita} {r.materiale?.unita ?? 'pz'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatEuro(r.prezzoUnitario)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatEuro(Math.round(r.quantita * r.prezzoUnitario))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">Totale ordine</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">{formatEuro(totale)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Aggiorna stato</h2>
        <StatoOrdineControlUfficio ordineId={ordine.id} statoCorrente={ordine.stato} />
      </div>
    </div>
  )
}
