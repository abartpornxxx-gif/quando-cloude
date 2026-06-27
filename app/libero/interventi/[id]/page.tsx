import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { MapPin, Calendar, Euro, Clock, User } from 'lucide-react'

function fmt(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtEuro(c: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(c / 100)
}

const STATO_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'danger' }> = {
  pianificato: { label: 'Pianificato', variant: 'info' },
  in_corso:    { label: 'In corso',    variant: 'warning' },
  completato:  { label: 'Completato',  variant: 'success' },
  annullato:   { label: 'Annullato',   variant: 'neutral' },
}

export default async function InterventoDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const { libero } = await requireLibero()
  const { id } = await params

  const intervento = await prisma.interventoLibero.findFirst({
    where: { id, liberoId: libero.id },
    include: { cliente: true },
  })
  if (!intervento) notFound()

  const s = STATO_BADGE[intervento.stato] || { label: intervento.stato, variant: 'neutral' as const }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={intervento.titolo}
        backHref="/libero/interventi"
        badge={<Badge variant={s.variant}>{s.label}</Badge>}
      />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dettagli</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {intervento.cliente && (
            <div className="flex items-start gap-3">
              <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="text-sm font-semibold text-gray-900">{intervento.cliente.nome}</p>
                {intervento.cliente.telefono && (
                  <a href={`tel:${intervento.cliente.telefono}`}
                    className="text-xs text-orange-600 hover:underline">{intervento.cliente.telefono}</a>
                )}
              </div>
            </div>
          )}

          {intervento.dataIntervento && (
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Data</p>
                <p className="text-sm font-semibold text-gray-900">{fmt(intervento.dataIntervento)}</p>
              </div>
            </div>
          )}

          {intervento.indirizzo && (
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Indirizzo</p>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(intervento.indirizzo)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-orange-600 hover:underline">
                  {intervento.indirizzo}
                </a>
              </div>
            </div>
          )}

          {intervento.importo > 0 && (
            <div className="flex items-start gap-3">
              <Euro size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Importo</p>
                <p className="text-sm font-semibold text-gray-900">{fmtEuro(intervento.importo)}</p>
              </div>
            </div>
          )}

          {intervento.oreImpiegate != null && (
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Ore impiegate</p>
                <p className="text-sm font-semibold text-gray-900">{intervento.oreImpiegate}h</p>
              </div>
            </div>
          )}
        </div>

        {intervento.descrizione && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Descrizione</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervento.descrizione}</p>
          </div>
        )}

        {intervento.note && (
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-1">Note</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervento.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}
