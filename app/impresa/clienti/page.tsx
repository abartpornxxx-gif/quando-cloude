import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaCliente } from './actions'

export default async function ClientiPage() {
  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
          <p className="mt-1 text-sm text-gray-500">{clienti.length} clienti totali</p>
        </div>
        <Link
          href="/impresa/clienti/nuovo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nuovo cliente
        </Link>
      </div>

      {clienti.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessun cliente. Crea il primo!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="hidden px-4 py-3 sm:table-cell">P.IVA / CF</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="hidden px-4 py-3 md:table-cell">Telefono</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clienti.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                    {c.partitaIva ?? c.codiceFiscale ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{c.email ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/impresa/clienti/${c.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Modifica
                      </Link>
                      <DeleteButton action={eliminaCliente.bind(null, c.id)} />
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
