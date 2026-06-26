import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaFornitoreUfficio } from './actions'

export default async function UfficioFornitoriPage() {
  await requireUfficio()
  const fornitori = await prisma.fornitore.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <PageHeader title="Fornitori" subtitle={`${fornitori.length} fornitori`}
        action={<Link href="/ufficio/fornitori/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuovo</Link>} />

      {fornitori.length === 0 ? (
        <EmptyState title="Nessun fornitore" description="Aggiungi il primo fornitore."
          action={<Link href="/ufficio/fornitori/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuovo fornitore</Link>} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {fornitori.map(f => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
                  {f.nome.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()}
                </div>
                <Link href={`/ufficio/fornitori/${f.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{f.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.email ?? f.telefono ?? f.citta ?? ''}</p>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/ufficio/fornitori/${f.id}`} className="hidden sm:block text-xs font-medium text-teal-600 hover:text-teal-800">Modifica</Link>
                  <DeleteButton action={eliminaFornitoreUfficio.bind(null, f.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

