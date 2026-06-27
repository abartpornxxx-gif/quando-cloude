import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { Calendar, Plus, MapPin } from 'lucide-react'

function fmt(d: Date) {
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const TIPO_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' }> = {
  sopralluogo: { label: 'Sopralluogo', variant: 'info' },
  intervento:  { label: 'Intervento',  variant: 'warning' },
  riunione:    { label: 'Riunione',    variant: 'neutral' },
  scadenza:    { label: 'Scadenza',    variant: 'warning' },
  altro:       { label: 'Altro',       variant: 'neutral' },
}

export default async function AppuntamentiLiberoPage() {
  await requireLibero()

  const promemoria = await prisma.promemoria.findMany({
    where: { dataOra: { gte: new Date(Date.now() - 7 * 86400000) } },
    orderBy: { dataOra: 'asc' },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appuntamenti"
        badge={<Badge variant="neutral">{promemoria.length}</Badge>}
        action={
          <Link href="/libero/appuntamenti/nuovo"
            className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
            <Plus size={14} /> Nuovo
          </Link>
        }
      />

      {promemoria.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Nessun appuntamento"
          description="Aggiungi i tuoi appuntamenti e sopralluoghi."
          action={
            <Link href="/libero/appuntamenti/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
              <Plus size={14} /> Nuovo appuntamento
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {promemoria.map(p => {
              const tipo = p.tipo || 'altro'
              const t = TIPO_BADGE[tipo] || { label: tipo, variant: 'neutral' as const }
              const scaduto = new Date(p.dataOra) < new Date()
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${scaduto ? 'bg-red-100' : 'bg-orange-100'}`}>
                    <Calendar size={18} className={scaduto ? 'text-red-600' : 'text-orange-700'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.titolo}</p>
                    {p.luogo && (
                      <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {p.luogo}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={t.variant}>{t.label}</Badge>
                    <span className="text-xs text-gray-400">{fmt(p.dataOra)}</span>
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
