import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Phone, Mail, MapPin, Wrench } from 'lucide-react'

const STATO_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  pianificato: { label: 'Pianificato', variant: 'info' },
  in_corso:    { label: 'In corso',    variant: 'warning' },
  completato:  { label: 'Completato',  variant: 'success' },
  annullato:   { label: 'Annullato',   variant: 'neutral' },
}

export default async function ClienteLiberoDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const { libero } = await requireLibero()
  const { id } = await params

  const cliente = await prisma.cliente.findFirst({
    where: { id },
    include: {
      interventiLibero: {
        where: { liberoId: libero.id },
        orderBy: { dataIntervento: 'desc' },
        take: 10,
      },
    },
  })
  if (!cliente) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={cliente.nome} backHref="/libero/clienti" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contatti</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cliente.telefono && (
            <a href={`tel:${cliente.telefono}`}
              className="flex items-center gap-2 text-sm text-orange-600 hover:underline">
              <Phone size={14} className="text-gray-400" /> {cliente.telefono}
            </a>
          )}
          {cliente.email && (
            <a href={`mailto:${cliente.email}`}
              className="flex items-center gap-2 text-sm text-orange-600 hover:underline">
              <Mail size={14} className="text-gray-400" /> {cliente.email}
            </a>
          )}
          {cliente.indirizzo && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(cliente.indirizzo)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-orange-600 hover:underline sm:col-span-2">
              <MapPin size={14} className="text-gray-400" /> {cliente.indirizzo}
            </a>
          )}
          {cliente.partitaIva && (
            <p className="text-sm text-gray-600">P.IVA: {cliente.partitaIva}</p>
          )}
          {cliente.note && (
            <p className="text-sm text-gray-500 sm:col-span-2">{cliente.note}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Interventi ({cliente.interventiLibero.length})
        </p>
        {cliente.interventiLibero.length === 0 ? (
          <EmptyState icon="🔧" title="Nessun intervento per questo cliente" />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
            <div className="divide-y divide-gray-100">
              {cliente.interventiLibero.map(int => {
                const s = STATO_BADGE[int.stato] || { label: int.stato, variant: 'neutral' as const }
                return (
                  <Link key={int.id} href={`/libero/interventi/${int.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <Wrench size={14} className="text-orange-600 shrink-0" />
                    <p className="flex-1 text-sm font-medium text-gray-900 truncate">{int.titolo}</p>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
