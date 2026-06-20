import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaOperaioUfficio } from './actions'

export default async function UfficioOperaiPage() {
  await requireUfficio()
  const operai = await prisma.operaio.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, ruolo: true, zona: true, email: true },
  })

  return (
    <div>
      <PageHeader
        title="Operai"
        subtitle={`${operai.length} ${operai.length === 1 ? 'operaio' : 'operai'} in organico`}
        action={
          <Link href="/ufficio/operai/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
            + Nuovo
          </Link>
        }
      />

      {operai.length === 0 ? (
        <EmptyState title="Nessun operaio" description="Aggiungi il primo membro del team."
          action={<Link href="/ufficio/operai/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuovo operaio</Link>} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {operai.map(o => {
              const initials = o.nome.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()
              return (
                <div key={o.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
                    {initials}
                  </div>
                  <Link href={`/ufficio/operai/${o.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{o.nome}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                      {o.ruolo && <span>{o.ruolo}</span>}
                      {o.ruolo && o.zona && <span>·</span>}
                      {o.zona && <span>{o.zona}</span>}
                      {!o.ruolo && !o.zona && <span>Nessun ruolo assegnato</span>}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link href={`/ufficio/operai/${o.id}`} className="hidden sm:block text-xs font-medium text-teal-600 hover:text-teal-800">Modifica</Link>
                    <DeleteButton action={eliminaOperaioUfficio.bind(null, o.id)} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
