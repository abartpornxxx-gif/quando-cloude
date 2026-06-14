import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaFornitore } from './actions'

export default async function FornitoriPage() {
  const fornitori = await prisma.fornitore.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornitori</h1>
          <p className="mt-1 text-sm text-gray-500">{fornitori.length} fornitori totali</p>
        </div>
        <Link href="/impresa/fornitori/nuovo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Nuovo fornitore
        </Link>
      </div>

      {fornitori.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessun fornitore registrato.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="hidden px-4 py-3 sm:table-cell">P.IVA / CF</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fornitori.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.nome}</td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{f.partitaIva ?? f.codiceFiscale ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{f.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/impresa/fornitori/${f.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">Modifica</Link>
                      <DeleteButton action={eliminaFornitore.bind(null, f.id)} />
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
