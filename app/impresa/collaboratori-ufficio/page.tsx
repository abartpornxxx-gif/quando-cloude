import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaCollaboratoreUfficio } from './actions'

export default async function CollaboratoriUfficioPage() {
  await requireImpresa()
  const collaboratori = await prisma.collaboratoreUfficio.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <PageHeader
        title="Collaboratori ufficio"
        subtitle={`${collaboratori.length} ${collaboratori.length === 1 ? 'collaboratore' : 'collaboratori'}`}
        action={
          <Link
            href="/impresa/collaboratori-ufficio/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo
          </Link>
        }
      />

      {collaboratori.length === 0 ? (
        <EmptyState
          title="Nessun collaboratore ufficio"
          description="Aggiungi i collaboratori amministrativi per dargli accesso all'area ufficio (preventivi, ordini, fatture, pianificazione)."
          action={
            <Link
              href="/impresa/collaboratori-ufficio/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuovo collaboratore
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {collaboratori.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
                  {c.nome.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()}
                </div>
                <Link href={`/impresa/collaboratori-ufficio/${c.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{c.nome}</p>
                  {c.email && <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>}
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <Link href={`/impresa/collaboratori-ufficio/${c.id}`} className="hidden sm:block text-xs font-medium text-blue-600 hover:text-blue-800">
                    Modifica
                  </Link>
                  <DeleteButton action={eliminaCollaboratoreUfficio.bind(null, c.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
