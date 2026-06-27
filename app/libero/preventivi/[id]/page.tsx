import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Printer } from 'lucide-react'

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
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

export default async function PreventivoLiberoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLibero()
  const { id } = await params

  const prev = await prisma.preventivo.findFirst({
    where: { id },
    include: {
      cliente: true,
      righe: { orderBy: { ordine: 'asc' } },
    },
  })
  if (!prev) notFound()

  const s = STATO_BADGE[prev.stato] || { label: prev.stato, variant: 'neutral' as const }

  const totale = prev.righe.reduce((sum, r) => sum + r.prezzoUnitario * r.quantita, 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={prev.note?.slice(0, 50) || `Preventivo del ${fmt(prev.data || prev.createdAt)}`}
        backHref="/libero/preventivi"
        badge={<Badge variant={s.variant}>{s.label}</Badge>}
        action={
          <Link href={`/libero/preventivi/${id}/stampa`} target="_blank"
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium transition-colors">
            <Printer size={14} /> Stampa / PDF
          </Link>
        }
      />

      {prev.cliente && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-5">
          <p className="text-xs text-gray-500 mb-1">Cliente</p>
          <p className="font-semibold text-gray-900">{prev.cliente.nome}</p>
          {prev.cliente.indirizzo && <p className="text-sm text-gray-500">{prev.cliente.indirizzo}</p>}
          {prev.cliente.partitaIva && <p className="text-sm text-gray-500">P.IVA: {prev.cliente.partitaIva}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voci</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Descrizione</th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Q.tà</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Totale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {prev.righe.map(r => {
              const riga = r.prezzoUnitario * r.quantita
              return (
                <tr key={r.id}>
                  <td className="px-5 py-3 text-gray-900">{r.descrizione}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{r.quantita}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtEuro(riga)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 text-right">
          <p className="text-base font-bold text-gray-900">Totale imponibile: {fmtEuro(totale)}</p>
          <p className="text-xs text-gray-400">IVA da applicare in fattura</p>
        </div>
      </div>

      {prev.note && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-5">
          <p className="text-xs text-gray-500 mb-2">Note e condizioni</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{prev.note}</p>
        </div>
      )}
    </div>
  )
}
