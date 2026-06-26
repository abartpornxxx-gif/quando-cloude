import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaCliente } from './actions'
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
    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
      {initials}
    </div>
  )
}

export default async function ClientiPage() {
  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <PageHeader
        title="Clienti"
        subtitle={`${clienti.length} ${clienti.length === 1 ? 'cliente' : 'clienti'}`}
        action={
          <Link
            href="/impresa/clienti/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo
          </Link>
        }
      />

      {clienti.length === 0 ? (
        <EmptyState
          icon="/immagini/icona-persone.png"
          title="Nessun cliente"
          description="Aggiungi il primo cliente per creare preventivi e commesse."
          action={
            <Link
              href="/impresa/clienti/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuovo cliente
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {clienti.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
              >
                <Avatar nome={c.nome} />
                <Link href={`/impresa/clienti/${c.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                    {c.nome}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                    {c.email && <span className="truncate">{c.email}</span>}
                    {c.email && c.telefono && <span>Â·</span>}
                    {c.telefono && <span className="shrink-0">{c.telefono}</span>}
                    {!c.email && !c.telefono && (
                      <span>{c.partitaIva ?? c.codiceFiscale ?? 'Nessun contatto'}</span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/impresa/clienti/${c.id}`}
                    className="hidden sm:block text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Modifica
                  </Link>
                  <DeleteButton action={eliminaCliente.bind(null, c.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

