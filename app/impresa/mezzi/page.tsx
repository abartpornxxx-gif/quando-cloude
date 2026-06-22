import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaMezzo } from './actions'

const STATO_LABEL: Record<string, string> = {
  disponibile: 'Disponibile', in_uso: 'In uso',
  in_manutenzione: 'In manutenzione', fuori_servizio: 'Fuori servizio',
}
const STATO_COLOR: Record<string, string> = {
  disponibile: 'bg-green-100 text-green-700', in_uso: 'bg-blue-100 text-blue-700',
  in_manutenzione: 'bg-yellow-100 text-yellow-700', fuori_servizio: 'bg-red-100 text-red-700',
}

function scadenzaBadge(
  data: Date | null,
  label: string,
  oggiUtc: number,
): { cls: string; text: string } | null {
  if (!data) return null
  const dUtc = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
  const diff = Math.floor((dUtc - oggiUtc) / 86_400_000)
  const dateStr = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(data)
  if (diff < 0) return { cls: 'bg-red-100 text-red-700', text: `${label}: Scaduto (${dateStr})` }
  if (diff === 0) return { cls: 'bg-orange-100 text-orange-700', text: `${label}: Oggi` }
  if (diff <= 30) return { cls: 'bg-amber-100 text-amber-700', text: `${label}: ${dateStr}` }
  return { cls: 'bg-gray-100 text-gray-500', text: `${label}: ${dateStr}` }
}

export default async function MezziPage() {
  await requireImpresa()

  const oggi = new Date()
  const oggiUtc = Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth(), oggi.getUTCDate())

  const mezzi = await prisma.mezzo.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mezzi aziendali</h1>
          <p className="mt-1 text-sm text-gray-500">{mezzi.length} mezzi</p>
        </div>
        <Link href="/impresa/mezzi/nuovo" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Nuovo mezzo
        </Link>
      </div>

      {mezzi.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessun mezzo registrato.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="hidden px-4 py-3 sm:table-cell">Targa</th>
                <th className="px-4 py-3">Stato</th>
                <th className="hidden px-4 py-3 lg:table-cell">Scadenze</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mezzi.map(m => {
                const badges = [
                  scadenzaBadge(m.scadenzaBollo, 'Bollo', oggiUtc),
                  scadenzaBadge(m.scadenzaRevisione, 'Revisione', oggiUtc),
                  scadenzaBadge(m.scadenzaAssicurazione, 'Ass.', oggiUtc),
                ].filter(Boolean)
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.nome}</td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{m.targa ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATO_COLOR[m.stato]}`}>
                        {STATO_LABEL[m.stato]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {badges.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          badges.map((b, i) => (
                            <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-medium ${b!.cls}`}>
                              {b!.text}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/impresa/mezzi/${m.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">Modifica</Link>
                        <DeleteButton action={eliminaMezzo.bind(null, m.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
