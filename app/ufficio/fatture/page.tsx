import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const BADGE_VARIANT: Record<string, BadgeVariant> = { da_incassare: 'warning', incassata: 'success', scaduta: 'danger' }
const LABEL: Record<string, string> = { da_incassare: 'Da incassare', incassata: 'Incassata', scaduta: 'Scaduta' }

export default async function UfficioFatturePage() {
  await requireUfficio()

  const fatture = await prisma.fatturaAttiva.findMany({
    include: { cliente: { select: { nome: true } }, commessa: { select: { nome: true } }, righe: true },
    orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
  })

  function totaleImponibile(righe: { quantita: number; prezzoUnitario: number }[]) {
    return righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
  }

  const totaleDaIncassare = fatture
    .filter(f => f.stato === 'da_incassare' || f.stato === 'scaduta')
    .reduce((acc, f) => acc + totaleImponibile(f.righe), 0)
  const scadute = fatture.filter(f => f.stato === 'scaduta').length

  return (
    <div>
      <PageHeader
        title="Fatture attive"
        subtitle={`${fatture.length} ${fatture.length === 1 ? 'fattura' : 'fatture'} emesse${scadute > 0 ? ` · ${scadute} scadute` : ''}`}
        action={<Link href="/ufficio/fatture/nuova" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuova</Link>}
      />

      {totaleDaIncassare > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Totale da incassare</p>
            <p className="text-2xl font-bold text-amber-900 mt-0.5">{formatEuro(totaleDaIncassare)}</p>
          </div>
          {scadute > 0 && <Badge variant="danger">{scadute} scadut{scadute === 1 ? 'a' : 'e'}</Badge>}
        </div>
      )}

      {fatture.length === 0 ? (
        <EmptyState title="Nessuna fattura" description="Emetti la prima fattura."
          action={<Link href="/ufficio/fatture/nuova" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuova fattura</Link>} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {fatture.map(f => {
              const imponibile = totaleImponibile(f.righe)
              const iva = Math.round(imponibile * f.aliquotaIva / 100)
              return (
                <Link key={f.id} href={`/ufficio/fatture/${f.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                  <div className="shrink-0 text-center w-14">
                    <p className="text-base font-bold text-gray-900 leading-none">{f.numero}/{f.anno}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatData(f.data)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors truncate">{f.cliente?.nome ?? '—'}</span>
                      <Badge variant={BADGE_VARIANT[f.stato] ?? 'neutral'}>{LABEL[f.stato] ?? f.stato}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.commessa?.nome ?? 'Senza commessa'}
                      {f.dataScadenza ? ` · Scad. ${formatData(f.dataScadenza)}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatEuro(imponibile + iva)}</p>
                    <p className="text-xs text-gray-400">IVA {f.aliquotaIva}%</p>
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
