import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaMagazziniere } from './actions'

export default async function MagazzinieriPage() {
  await requireImpresa()
  const magazzinieri = await prisma.magazziniere.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <PageHeader
        title="Magazzinieri"
        subtitle={`${magazzinieri.length} ${magazzinieri.length === 1 ? 'magazziniere' : 'magazzinieri'}`}
        action={
          <Link
            href="/impresa/magazzinieri/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo
          </Link>
        }
      />

      {magazzinieri.length === 0 ? (
        <EmptyState
          icon="🏭"
          title="Nessun magazziniere"
          description="Aggiungi i magazzinieri per gestire il magazzino e creare i loro accessi."
          action={
            <Link
              href="/impresa/magazzinieri/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuovo magazziniere
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {magazzinieri.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
                  {m.nome.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()}
                </div>
                <Link href={`/impresa/magazzinieri/${m.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {m.nome}
                  </p>
                  {m.email && <p className="text-xs text-gray-400 mt-0.5">{m.email}</p>}
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <Link
                    href={`/impresa/magazzinieri/${m.id}`}
                    className="hidden sm:block text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Modifica
                  </Link>
                  <DeleteButton action={eliminaMagazziniere.bind(null, m.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
