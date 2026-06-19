import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import Link from 'next/link'
import { eliminaSuggerimento, toggleSuggerimento } from './actions'

export default async function ChecklistPage() {
  await requireImpresa()

  const suggerimenti = await prisma.suggerimentoCantiere.findMany({
    orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <div>
      <PageHeader
        title="Promemoria cantiere"
        subtitle="Promemoria interattivi mostrati agli operai durante la giornata"
        action={
          <Link
            href="/impresa/checklist/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Aggiungi
          </Link>
        }
      />

      {suggerimenti.length === 0 ? (
        <EmptyState
          icon="/immagini/successo.png"
          title="Nessun promemoria configurato"
          description="Aggiungi promemoria che gli operai spuntano durante la giornata (es. 'Pulire il cantiere', 'Controllare gli attrezzi')."
          action={
            <Link
              href="/impresa/checklist/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Primo promemoria
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          {suggerimenti.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${s.attivo ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {s.testo}
                  </p>
                  {s.categoria && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{s.categoria}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <form action={toggleSuggerimento.bind(null, s.id, !s.attivo)}>
                  <button
                    type="submit"
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      s.attivo
                        ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                        : 'border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {s.attivo ? 'Attivo' : 'Disattivo'}
                  </button>
                </form>
                <Link
                  href={`/impresa/checklist/${s.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Modifica
                </Link>
                <DeleteButton
                  action={eliminaSuggerimento.bind(null, s.id)}
                  confirmMessage={`Eliminare il promemoria "${s.testo}"?`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
