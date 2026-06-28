import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { approvaAssenza, rifiutaAssenza, eliminaAssenza } from './actions'
import { formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const TIPO_LABEL: Record<string, string> = {
  ferie: 'Ferie',
  permesso: 'Permesso',
  malattia: 'Malattia',
  altro: 'Altro',
}

const STATO_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  in_attesa: 'warning',
  approvata: 'success',
  rifiutata: 'danger',
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
      <PageHeader
        title="Assenze operai"
        subtitle={`${assenze.length} ${assenze.length === 1 ? 'richiesta' : 'richieste'}`}
      />

      {assenze.length === 0 && (
        <EmptyState
          icon="/immagini/vuoto-cantieri.png"
          title="Nessuna richiesta di assenza"
          description="Le richieste di ferie, permessi e malattie degli operai appariranno qui."
        />
      )}

      {inAttesa.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700">
            In attesa di approvazione ({inAttesa.length})
          </h2>
          <ul className="space-y-3">
            {inAttesa.map(a => (
              <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{a.operaio.nome}</div>
                  <div className="text-sm text-gray-600 mt-0.5">
                    {TIPO_LABEL[a.tipo]} — dal {formatData(a.dataInizio)} al {formatData(a.dataFine)}
                  </div>
                  {a.note && <div className="mt-1 text-xs text-gray-400">{a.note}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={approvaAssenza.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      Approva
                    </button>
                  </form>
                  <form action={rifiutaAssenza.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Storico assenze</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {altreAssenze.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{a.operaio.nome}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {TIPO_LABEL[a.tipo]} — {formatData(a.dataInizio)} → {formatData(a.dataFine)}
                  </div>
                </div>
                <Badge variant={STATO_VARIANT[a.stato]}>
                  {STATO_LABEL[a.stato]}
                </Badge>
                <form action={eliminaAssenza.bind(null, a.id)}>
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Elimina
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
