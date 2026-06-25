import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { approvaAssenza, rifiutaAssenza, eliminaAssenza } from './actions'
import { formatData } from '@/lib/format'

const TIPO_LABEL: Record<string, string> = {
  ferie: 'Ferie',
  permesso: 'Permesso',
  malattia: 'Malattia',
  altro: 'Altro',
}

const STATO_BADGE: Record<string, string> = {
  in_attesa: 'bg-yellow-100 text-yellow-800',
  approvata: 'bg-emerald-100 text-emerald-800',
  rifiutata: 'bg-red-100 text-red-800',
}

const STATO_LABEL: Record<string, string> = {
  in_attesa: 'In attesa',
  approvata: 'Approvata',
  rifiutata: 'Rifiutata',
}

export default async function AssenzePage() {
  await requireImpresa()

  const assenze = await prisma.assenza.findMany({
    include: { operaio: { select: { nome: true } } },
    orderBy: [{ stato: 'asc' }, { dataInizio: 'desc' }],
  })

  const inAttesa = assenze.filter(a => a.stato === 'in_attesa')
  const altreAssenze = assenze.filter(a => a.stato !== 'in_attesa')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Assenze operai</h1>

      {inAttesa.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-yellow-800">
            In attesa di approvazione ({inAttesa.length})
          </h2>
          <ul className="space-y-3">
            {inAttesa.map(a => (
              <li key={a.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{a.operaio.nome}</div>
                  <div className="text-sm text-gray-600">
                    {TIPO_LABEL[a.tipo]} — dal {formatData(a.dataInizio)} al {formatData(a.dataFine)}
                  </div>
                  {a.note && <div className="mt-1 text-xs text-gray-400">{a.note}</div>}
                </div>
                <div className="flex gap-2">
                  <form action={approvaAssenza.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Approva
                    </button>
                  </form>
                  <form action={rifiutaAssenza.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Rifiuta
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {altreAssenze.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Storico assenze</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {altreAssenze.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{a.operaio.nome}</div>
                  <div className="text-xs text-gray-500">
                    {TIPO_LABEL[a.tipo]} — {formatData(a.dataInizio)} → {formatData(a.dataFine)}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[a.stato]}`}>
                  {STATO_LABEL[a.stato]}
                </span>
                <form action={eliminaAssenza.bind(null, a.id)}>
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-500">
                    Elimina
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {assenze.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          Nessuna richiesta di assenza
        </div>
      )}
    </div>
  )
}
