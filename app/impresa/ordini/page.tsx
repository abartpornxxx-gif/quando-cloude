import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

const STATO_LABEL: Record<string, string> = {
  richiesto: 'Da ordinare',
  ordinato: 'Ordinato',
  consegnato: 'Consegnato',
  usato: 'Usato',
}
const STATO_VARIANT: Record<string, BadgeVariant> = {
  richiesto: 'neutral',
  ordinato: 'warning',
  consegnato: 'success',
  usato: 'info',
}

export default async function OrdiniPage() {
  await requireImpresa()

  const ordini = await prisma.ordineFornitore.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fornitore: { select: { nome: true } },
      commessa: { select: { nome: true } },
      righe: true,
    },
  })

  const aperti = ordini.filter(o => o.stato === 'richiesto' || o.stato === 'ordinato').length

  return (
    <div>
      <PageHeader
        title="Ordini materiale"
        subtitle={`${ordini.length} ${ordini.length === 1 ? 'ordine' : 'ordini'} totali${aperti > 0 ? ` · ${aperti} aperti` : ''}`}
        action={
          <Link
            href="/impresa/ordini/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo
          </Link>
        }
      />

      {ordini.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Nessun ordine"
          description="Crea il primo ordine a un fornitore di materiali."
          action={
            <Link
              href="/impresa/ordini/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuovo ordine
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {ordini.map(o => {
            const totale = o.righe.reduce(
              (acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario),
              0,
            )
            return (
              <Link
                key={o.id}
                href={`/impresa/ordini/${o.id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all p-4 sm:p-5 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {o.fornitore?.nome ?? 'Fornitore non specificato'}
                    </span>
                    <Badge variant={STATO_VARIANT[o.stato] ?? 'neutral'}>
                      {STATO_LABEL[o.stato] ?? o.stato}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {o.commessa ? o.commessa.nome : 'Senza commessa'} · {formatData(o.createdAt)}
                  </p>
                  {o.note && (
                    <p className="text-xs text-gray-400 mt-1 italic">{o.note}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatEuro(totale)}</p>
                  <p className="text-xs text-gray-400">
                    {o.righe.length} {o.righe.length === 1 ? 'riga' : 'righe'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
