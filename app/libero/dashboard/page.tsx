import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { Wrench, Users, FileText, Plus, Calendar } from 'lucide-react'

function fmt(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

const STATO_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'danger' }> = {
  pianificato: { label: 'Pianificato', variant: 'info' },
  in_corso:    { label: 'In corso',    variant: 'warning' },
  completato:  { label: 'Completato',  variant: 'success' },
  annullato:   { label: 'Annullato',   variant: 'neutral' },
}

export default async function LiberoDashboardPage() {
  const { libero } = await requireLibero()

  const [interventiAperti, preventiviTot, clientiTot, prossimiInterventi] = await Promise.all([
    prisma.interventoLibero.count({ where: { liberoId: libero.id, stato: { in: ['pianificato', 'in_corso'] } } }),
    prisma.preventivo.count({ where: { clienteId: { not: null } } }),
    prisma.cliente.count(),
    prisma.interventoLibero.findMany({
      where: { liberoId: libero.id, stato: { in: ['pianificato', 'in_corso'] }, dataIntervento: { gte: new Date() } },
      orderBy: { dataIntervento: 'asc' },
      take: 5,
      include: { cliente: { select: { nome: true } } },
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bentornato, {libero.nome}</h1>
        <p className="text-sm text-gray-500 mt-1">Ecco la situazione di oggi</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Interventi aperti" value={interventiAperti} icon={Wrench} variant="warning"
          href="/libero/interventi" />
        <StatCard label="Clienti" value={clientiTot} icon={Users} variant="info"
          href="/libero/clienti" />
        <StatCard label="Preventivi" value={preventiviTot} icon={FileText} variant="default"
          href="/libero/preventivi" />
      </div>

      {/* Azioni rapide */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Azioni rapide</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/libero/interventi/nuovo"
            className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
            <Plus size={15} /> Nuovo intervento
          </Link>
          <Link href="/libero/preventivi/nuovo"
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium transition-colors">
            <Plus size={15} /> Preventivo rapido
          </Link>
          <Link href="/libero/clienti/nuovo"
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium transition-colors">
            <Plus size={15} /> Aggiungi cliente
          </Link>
        </div>
      </div>

      {/* Prossimi interventi */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prossimi interventi</p>
          <Link href="/libero/interventi" className="text-xs text-orange-600 font-semibold hover:underline">
            Vedi tutti →
          </Link>
        </div>

        {prossimiInterventi.length === 0 ? (
          <EmptyState
            icon="🔧"
            title="Nessun intervento programmato"
            description="Crea il tuo primo intervento per iniziare."
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
              {prossimiInterventi.map(int => {
                const s = STATO_BADGE[int.stato] || { label: int.stato, variant: 'neutral' as const }
                return (
                  <Link key={int.id} href={`/libero/interventi/${int.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 shrink-0">
                      <Wrench size={18} className="text-orange-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{int.titolo}</p>
                      <p className="text-xs text-gray-500 truncate">{int.cliente?.nome || 'Cliente non specificato'}</p>
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
    </div>
  )
}
