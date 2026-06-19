import { prisma } from '@/lib/prisma'
import { formatEuro } from '@/lib/format'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { archiviaCommessa } from './actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

function BudgetBar({ costi, preventivato }: { costi: number; preventivato: number }) {
  const pct = preventivato > 0 ? Math.min(Math.round((costi / preventivato) * 100), 100) : 0
  const barCls = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
  const txtCls = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-400'
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">Costi / Budget</span>
        <span className={`text-xs font-semibold ${txtCls}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barCls} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function CommessePage() {
  const commesse = await prisma.commessa.findMany({
    where: { archiviata: false },
    orderBy: { createdAt: 'desc' },
    include: {
      cliente: { select: { nome: true } },
      _count: { select: { adempimenti: true } },
      adempimenti: { where: { fatto: true }, select: { id: true } },
    },
  })

  const archiviate = await prisma.commessa.count({ where: { archiviata: true } })
  const aperte = commesse.filter(c => c.stato === 'aperta').length
  const chiuse = commesse.filter(c => c.stato === 'chiusa').length

  return (
    <div>
      <PageHeader
        title="Commesse"
        subtitle={`${aperte} aperte · ${chiuse} chiuse`}
        action={
          <div className="flex items-center gap-2">
            {archiviate > 0 && (
              <Link
                href="/impresa/commesse/archiviate"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
              >
                Archivio ({archiviate})
              </Link>
            )}
            <Link
              href="/impresa/commesse/nuova"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              + Nuova
            </Link>
          </div>
        }
      />

      {commesse.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title="Nessuna commessa"
          description="Crea la prima commessa o trasforma un preventivo accettato."
          action={
            <Link
              href="/impresa/commesse/nuova"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuova commessa
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {commesse.map(c => {
            const costi = c.costiMateriali + c.costiManodopera + c.costiMezzi
            const margine =
              c.preventivato > 0
                ? Math.round(((c.preventivato - costi) / c.preventivato) * 100)
                : null
            const totAdempimenti = c._count.adempimenti
            const fattiAdempimenti = c.adempimenti.length
            const adempimentiOk = totAdempimenti === 0 || fattiAdempimenti === totAdempimenti
            return (
              <div
                key={c.id}
                className="flex items-stretch rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all overflow-hidden"
              >
                <Link
                  href={`/impresa/commesse/${c.id}`}
                  className="flex-1 min-w-0 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{c.nome}</span>
                        <Badge
                          variant={c.stato === 'aperta' ? 'success' : 'neutral'}
                          dot={c.stato === 'aperta'}
                        >
                          {c.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
                        </Badge>
                        {totAdempimenti > 0 && (
                          <span
                            className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                              adempimentiOk
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {adempimentiOk ? '✓' : '!'} {fattiAdempimenti}/{totAdempimenti} adem.
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {c.cliente?.nome ?? 'Senza cliente'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatEuro(c.preventivato)}
                      </p>
                      {margine !== null && (
                        <p
                          className={`text-xs font-bold mt-0.5 ${
                            margine > 10
                              ? 'text-emerald-600'
                              : margine > 0
                              ? 'text-amber-600'
                              : 'text-red-500'
                          }`}
                        >
                          {margine > 0 ? '+' : ''}
                          {margine}% margine
                        </p>
                      )}
                    </div>
                  </div>
                  {c.preventivato > 0 && <BudgetBar costi={costi} preventivato={c.preventivato} />}
                </Link>
                <div className="flex items-center px-3 border-l border-gray-100">
                  <DeleteButton
                    action={archiviaCommessa.bind(null, c.id)}
                    label="Archivia"
                    variant="warning"
                    confirmMessage={`Archiviare "${c.nome}"? I dati (giornate, foto, fatture) vengono conservati e puoi ripristinarla in qualsiasi momento.`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
