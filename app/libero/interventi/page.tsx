import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { Wrench, Plus, Calendar } from 'lucide-react'

function fmt(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATO_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'danger' }> = {
  pianificato: { label: 'Pianificato', variant: 'info' },
  in_corso:    { label: 'In corso',    variant: 'warning' },
  completato:  { label: 'Completato',  variant: 'success' },
  annullato:   { label: 'Annullato',   variant: 'neutral' },
}

export default async function InterventiLiberoPage() {
  const { libero } = await requireLibero()

  const interventi = await prisma.interventoLibero.findMany({
    where: { liberoId: libero.id },
    orderBy: [{ dataIntervento: 'desc' }, { createdAt: 'desc' }],
    include: { cliente: { select: { nome: true } } },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="I miei interventi"
        badge={<Badge variant="neutral">{interventi.length}</Badge>}
        action={
          <Link href="/libero/interventi/nuovo"
            className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
            <Plus size={14} /> Nuovo
          </Link>
        }
      />

      {interventi.length === 0 ? (
        <EmptyState
          icon="🔧"
          title="Nessun intervento"
          description="Crea il tuo primo intervento per tracciare i lavori."
          action={
            <Link href="/libero/interventi/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
              <Plus size={14} /> Nuovo intervento
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {interventi.map(int => {
              const s = STATO_BADGE[int.stato] || { label: int.stato, variant: 'neutral' as const }
              return (
                <Link key={int.id} href={`/libero/interventi/${int.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 shrink-0">
                    <Wrench size={18} className="text-orange-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{int.titolo}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {int.cliente?.nome || 'Cliente non specificato'}
                      {int.indirizzo ? ` · ${int.indirizzo}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    {int.dataIntervento && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={11} />
                        {fmt(int.dataIntervento)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
