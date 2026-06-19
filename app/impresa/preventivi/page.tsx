import { prisma } from '@/lib/prisma'
import { formatEuro, formatData } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaPreventivo } from './actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

const STATO_LABEL: Record<string, string> = {
  bozza: 'Bozza',
  inviato: 'Inviato',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
}
const STATO_VARIANT: Record<string, BadgeVariant> = {
  bozza: 'neutral',
  inviato: 'info',
  accettato: 'success',
  rifiutato: 'danger',
}

export default async function PreventiviPage() {
  const preventivi = await prisma.preventivo.findMany({
    orderBy: { data: 'desc' },
    include: { cliente: { select: { nome: true } }, righe: true },
  })

  const accettati = preventivi.filter(p => p.stato === 'accettato').length
  const inviati = preventivi.filter(p => p.stato === 'inviato').length
  const bozze = preventivi.filter(p => p.stato === 'bozza').length

  return (
    <div>
      <PageHeader
        title="Preventivi"
        subtitle={`${accettati} accettati · ${inviati} inviati · ${bozze} bozze`}
        action={
          <Link
            href="/impresa/preventivi/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo
          </Link>
        }
      />

      {preventivi.length === 0 ? (
        <EmptyState
          icon="/immagini/vuoto-documenti.png"
          title="Nessun preventivo"
          description="Crea il primo preventivo per un cliente."
          action={
            <Link
              href="/impresa/preventivi/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuovo preventivo
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {preventivi.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors group"
              >
                {/* Data */}
                <div className="shrink-0 text-center w-14 hidden sm:block">
                  <p className="text-sm font-bold text-gray-700 leading-none">
                    {new Date(p.data).getDate().toString().padStart(2, '0')}/
                    {(new Date(p.data).getMonth() + 1).toString().padStart(2, '0')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.data).getFullYear()}
                  </p>
                </div>

                {/* Info principale */}
                <Link href={`/impresa/preventivi/${p.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {p.cliente?.nome ?? 'Cliente non specificato'}
                    </span>
                    <Badge variant={STATO_VARIANT[p.stato]}>
                      {STATO_LABEL[p.stato]}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatData(p.data)}</p>
                </Link>

                {/* Totale + azioni */}
                <div className="flex items-center gap-4 shrink-0">
                  <Link href={`/impresa/preventivi/${p.id}`} className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatEuro(calcolaTotalePreventivo(p.righe))}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.righe.length} {p.righe.length === 1 ? 'riga' : 'righe'}
                    </p>
                  </Link>
                  <DeleteButton action={eliminaPreventivo.bind(null, p.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
