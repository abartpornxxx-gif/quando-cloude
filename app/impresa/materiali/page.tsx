import { prisma } from '@/lib/prisma'
import { formatEuro } from '@/lib/format'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaMateriale } from './actions'

export default async function MaterialiPage() {
  const materiali = await prisma.materiale.findMany({ orderBy: { descrizione: 'asc' } })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiali a listino</h1>
          <p className="mt-1 text-sm text-gray-500">{materiali.length} articoli</p>
        </div>
        <div className="flex gap-2">
          <Link href="/impresa/materiali/importa" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Import CSV
          </Link>
          <Link href="/impresa/materiali/nuovo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + Nuovo articolo
          </Link>
        </div>
      </div>

      {materiali.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessun materiale. Aggiungili uno per uno o importa un CSV.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Codice</th>
                <th className="px-4 py-3">Descrizione</th>
                <th className="hidden px-4 py-3 sm:table-cell">Unità</th>
                <th className="px-4 py-3 text-right">Prezzo</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materiali.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.codice ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.descrizione}</td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{m.unita ?? 'pz'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{formatEuro(m.prezzo)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/impresa/materiali/${m.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">Modifica</Link>
                      <DeleteButton action={eliminaMateriale.bind(null, m.id)} />
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
