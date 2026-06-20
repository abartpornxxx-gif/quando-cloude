import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaClienteUfficio } from './actions'

export default async function UfficioClientiPage() {
  await requireUfficio()
  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' } })

  return (
    <div>
      <PageHeader
        title="Clienti"
        subtitle={`${clienti.length} ${clienti.length === 1 ? 'cliente' : 'clienti'}`}
        action={
          <Link href="/ufficio/clienti/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors">
            + Nuovo
          </Link>
        }
      />

      {clienti.length === 0 ? (
        <EmptyState title="Nessun cliente" description="Aggiungi il primo cliente per creare preventivi."
          action={<Link href="/ufficio/clienti/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuovo cliente</Link>} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {clienti.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0 select-none">
                  {c.nome.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()}
                </div>
                <Link href={`/ufficio/clienti/${c.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{c.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.email ?? c.telefono ?? c.citta ?? ''}</p>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/ufficio/clienti/${c.id}`} className="hidden sm:block text-xs font-medium text-teal-600 hover:text-teal-800">Modifica</Link>
                  <DeleteButton action={eliminaClienteUfficio.bind(null, c.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
