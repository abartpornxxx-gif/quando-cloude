import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { Phone, Mail, Plus } from 'lucide-react'

export default async function ClientiLiberoPage() {
  await requireLibero()

  const clienti = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { interventiLibero: true } } },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clienti"
        badge={<Badge variant="neutral">{clienti.length}</Badge>}
        action={
          <Link href="/libero/clienti/nuovo"
            className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
            <Plus size={14} /> Nuovo
          </Link>
        }
      />

      {clienti.length === 0 ? (
        <EmptyState
          icon="👤"
          title="Nessun cliente"
          description="Aggiungi i tuoi clienti per collegarli agli interventi."
          action={
            <Link href="/libero/clienti/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
              <Plus size={14} /> Aggiungi cliente
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {clienti.map(c => (
              <Link key={c.id} href={`/libero/clienti/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-orange-700">{c.nome[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.telefono && (
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} />{c.telefono}</span>
                    )}
                    {c.email && (
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Mail size={11} />{c.email}</span>
                    )}
                  </div>
                </div>
                {c._count.interventiLibero > 0 && (
                  <Badge variant="warning">{c._count.interventiLibero} interv.</Badge>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
