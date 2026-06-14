import { prisma } from '@/lib/prisma'
import { formatEuro, formatData } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaPreventivo } from './actions'

const STATO_LABEL: Record<string, string> = {
  bozza: 'Bozza', inviato: 'Inviato', accettato: 'Accettato', rifiutato: 'Rifiutato',
}
const STATO_COLOR: Record<string, string> = {
  bozza: 'bg-gray-100 text-gray-600', inviato: 'bg-blue-100 text-blue-700',
  accettato: 'bg-green-100 text-green-700', rifiutato: 'bg-red-100 text-red-700',
}

export default async function PreventiviPage() {
  const preventivi = await prisma.preventivo.findMany({
    orderBy: { data: 'desc' },
    include: { cliente: { select: { nome: true } }, righe: true },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preventivi</h1>
          <p className="mt-1 text-sm text-gray-500">{preventivi.length} preventivi totali</p>
        </div>
        <Link href="/impresa/preventivi/nuovo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Nuovo preventivo
        </Link>
      </div>

      {preventivi.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessun preventivo. Creane uno!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3 text-right">Totale</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preventivi.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatData(p.data)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.cliente?.nome ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATO_COLOR[p.stato]}`}>
                      {STATO_LABEL[p.stato]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {formatEuro(calcolaTotalePreventivo(p.righe))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/impresa/preventivi/${p.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">Apri</Link>
                      <DeleteButton action={eliminaPreventivo.bind(null, p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
