import { prisma } from '@/lib/prisma'
import { formatEuro } from '@/lib/format'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaOperaio } from './actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

function Avatar({ nome }: { nome: string }) {
  const initials = nome
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
      {initials}
    </div>
  )
}

export default async function OperaiPage() {
  const operai = await prisma.operaio.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <PageHeader
        title="Operai"
        subtitle={`${operai.length} ${operai.length === 1 ? 'operaio' : 'operai'} in organico`}
        action={
          <Link
            href="/impresa/operai/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo
          </Link>
        }
      />

      {operai.length === 0 ? (
        <EmptyState
          icon="/immagini/icona-persone.png"
          title="Nessun operaio"
          description="Aggiungi il primo membro del team per assegnarli ai cantieri."
          action={
            <Link
              href="/impresa/operai/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuovo operaio
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {operai.map(o => (
              <div
                key={o.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
              >
                <Avatar nome={o.nome} />
                <Link href={`/impresa/operai/${o.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {o.nome}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                    {o.ruolo && <span>{o.ruolo}</span>}
                    {o.ruolo && o.zona && <span>·</span>}
                    {o.zona && <span>{o.zona}</span>}
                    {!o.ruolo && !o.zona && <span>Nessun ruolo assegnato</span>}
                  </div>
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">Costo/ora</p>
                    <p className="text-sm font-semibold text-gray-900">{formatEuro(o.costoOrario)}</p>
                  </div>
                  <Link
                    href={`/impresa/operai/${o.id}`}
                    className="hidden sm:block text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Modifica
                  </Link>
                  <DeleteButton action={eliminaOperaio.bind(null, o.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
