import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaAttrezzatura } from './actions'

const STATO_LABEL: Record<string, string> = {
  disponibile: 'Disponibile', in_uso: 'In uso',
  in_manutenzione: 'In manutenzione', fuori_servizio: 'Fuori servizio',
}
const STATO_COLOR: Record<string, string> = {
  disponibile: 'bg-green-100 text-green-700', in_uso: 'bg-blue-100 text-blue-700',
  in_manutenzione: 'bg-yellow-100 text-yellow-700', fuori_servizio: 'bg-red-100 text-red-700',
}

export default async function AttrezzaturePage() {
  const items = await prisma.attrezzatura.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attrezzature</h1>
          <p className="mt-1 text-sm text-gray-500">{items.length} attrezzature</p>
        </div>
        <Link href="/impresa/attrezzature/nuovo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Nuova attrezzatura
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Image src="/immagini/icona-attrezzatura.png" width={72} height={72} alt="" className="mx-auto mb-3 opacity-60" />
          <p className="text-gray-500">Nessuna attrezzatura registrata.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Stato</th>
                <th className="hidden px-4 py-3 sm:table-cell">Assegnatario</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATO_COLOR[a.stato]}`}>
                      {STATO_LABEL[a.stato]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{a.assegnatario ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/impresa/attrezzature/${a.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">Modifica</Link>
                      <DeleteButton action={eliminaAttrezzatura.bind(null, a.id)} />
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
