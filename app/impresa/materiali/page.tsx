import { prisma } from '@/lib/prisma'
import { formatEuro } from '@/lib/format'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaMateriale } from './actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function MaterialiPage() {
  const materiali = await prisma.materiale.findMany({ orderBy: { descrizione: 'asc' } })

  return (
    <div>
      <PageHeader
        title="Materiali a listino"
        subtitle={`${materiali.length} ${materiali.length === 1 ? 'articolo' : 'articoli'}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/impresa/materiali/importa"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Import CSV
            </Link>
            <Link
              href="/impresa/materiali/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              + Nuovo
            </Link>
          </div>
        }
      />

      {materiali.length === 0 ? (
        <EmptyState
          icon="/immagini/icona-materiale.png"
          title="Nessun materiale"
          description="Aggiungi articoli al listino uno per uno o importali da un file CSV."
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/impresa/materiali/importa"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Import CSV
              </Link>
              <Link
                href="/impresa/materiali/nuovo"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                + Nuovo articolo
              </Link>
            </div>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {materiali.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
              >
                {/* Codice */}
                {m.codice && (
                  <span className="shrink-0 font-mono text-xs text-gray-400 w-20 truncate hidden sm:block">
                    {m.codice}
                  </span>
                )}
                {/* Descrizione */}
                <Link href={`/impresa/materiali/${m.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                    {m.descrizione}
                  </p>
                  {m.codice && (
                    <p className="text-xs text-gray-400 mt-0.5 sm:hidden font-mono">{m.codice}</p>
                  )}
                </Link>
                {/* Unità */}
                <span className="shrink-0 text-xs text-gray-400 hidden sm:block w-8 text-center">
                  {m.unita ?? 'pz'}
                </span>
                {/* Prezzo */}
                <div className="shrink-0 text-right w-20">
                  <p className="text-sm font-semibold text-gray-900">{formatEuro(m.prezzo)}</p>
                  <p className="text-xs text-gray-400 sm:hidden">{m.unita ?? 'pz'}</p>
                </div>
                {/* Azioni */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/impresa/materiali/${m.id}`}
                    className="hidden sm:block text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Modifica
                  </Link>
                  <DeleteButton action={eliminaMateriale.bind(null, m.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

