import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { FileText, Plus, Calendar } from 'lucide-react'

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEuro(c: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(c / 100)
}

const STATO_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'danger' }> = {
  bozza:     { label: 'Bozza',     variant: 'neutral' },
  inviato:   { label: 'Inviato',   variant: 'info' },
  accettato: { label: 'Accettato', variant: 'success' },
  rifiutato: { label: 'Rifiutato', variant: 'danger' },
  scaduto:   { label: 'Scaduto',   variant: 'warning' },
}

export default async function PreventiviLiberoPage() {
  await requireLibero()

  const preventivi = await prisma.preventivo.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      cliente: { select: { nome: true } },
      righe: { select: { prezzoUnitario: true, quantita: true } },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preventivi"
        badge={<Badge variant="neutral">{preventivi.length}</Badge>}
        action={
          <Link href="/libero/preventivi/nuovo"
            className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
            <Plus size={14} /> Nuovo
          </Link>
        }
      />

      {preventivi.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Nessun preventivo"
          description="Crea il tuo primo preventivo da inviare al cliente."
          action={
            <Link href="/libero/preventivi/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors">
              <Plus size={14} /> Nuovo preventivo
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {preventivi.map(p => {
              const s = STATO_BADGE[p.stato] || { label: p.stato, variant: 'neutral' as const }
              const totale = p.righe.reduce((sum, r) => sum + r.prezzoUnitario * r.quantita, 0)
              return (
                <Link key={p.id} href={`/libero/preventivi/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 shrink-0">
                    <FileText size={18} className="text-orange-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {p.note?.slice(0, 40) || `Preventivo del ${fmt(p.data || p.createdAt)}`}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      <Calendar size={11} /> {fmt(p.data || p.createdAt)}
                      {p.cliente ? ` · ${p.cliente.nome}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <span className="text-xs font-semibold text-gray-700">{fmtEuro(totale)}</span>
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
