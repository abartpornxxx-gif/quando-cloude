import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const BADGE_VARIANT: Record<string, BadgeVariant> = { da_incassare: 'warning', parzialmente_incassata: 'warning', incassata: 'success', scaduta: 'danger' }
const LABEL: Record<string, string> = { da_incassare: 'Da incassare', parzialmente_incassata: 'Parz. incassata', incassata: 'Incassata', scaduta: 'Scaduta' }

export default async function UfficioFatturePage({
  searchParams,
}: {
  searchParams: Promise<{ commessaId?: string; clienteId?: string }>
}) {
  await requireUfficio()
  const { commessaId, clienteId } = await searchParams

  const where: Record<string, unknown> = {}
  if (commessaId) where.commessaId = commessaId
  if (clienteId) where.clienteId = clienteId

  // Risolvi label del filtro attivo
  let filtroLabel: string | null = null
  if (commessaId) {
    const c = await prisma.commessa.findUnique({ where: { id: commessaId }, select: { nome: true } })
    if (c) filtroLabel = `Commessa: ${c.nome}`
  } else if (clienteId) {
    const cl = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { nome: true } })
    if (cl) filtroLabel = `Cliente: ${cl.nome}`
  }

  const fatture = await prisma.fatturaAttiva.findMany({
    where,
    include: { cliente: { select: { nome: true } }, commessa: { select: { nome: true } }, righe: true },
    orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
  })

  function totaleImponibile(righe: { quantita: number; prezzoUnitario: number }[]) {
    return righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
  }

  const totaleDaIncassare = fatture
    .filter(f => f.stato === 'da_incassare' || f.stato === 'parzialmente_incassata' || f.stato === 'scaduta')
    .reduce((acc, f) => {
      const imp = totaleImponibile(f.righe)
      const iva = Math.round(imp * f.aliquotaIva / 100)
      return acc + (imp + iva) - (f.importoIncassato ?? 0)
    }, 0)
  const scadute = fatture.filter(f => f.stato === 'scaduta').length

  return (
    <div>
      <PageHeader
        title="Fatture attive"
        subtitle={`${fatture.length} ${fatture.length === 1 ? 'fattura' : 'fatture'}${filtroLabel ? ` Â· ${filtroLabel}` : ''}${scadute > 0 ? ` Â· ${scadute} scadute` : ''}`}
        action={<Link href="/ufficio/fatture/nuova" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuova</Link>}
      />

      {/* Breadcrumb filtro attivo */}
      {filtroLabel && (
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            {filtroLabel}
          </span>
          <Link href="/ufficio/fatture" className="text-xs text-gray-400 hover:text-gray-600">
            Ã— Rimuovi filtro
          </Link>
          {commessaId && (
            <Link href="/ufficio/saldi-pendenti" className="text-xs text-teal-500 hover:text-teal-700">
              â† Saldi pendenti
            </Link>
          )}
        </div>
      )}

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
        <EmptyState
          title={filtroLabel ? 'Nessuna fattura per questo filtro' : 'Nessuna fattura'}
          description={filtroLabel ? 'Non ci sono fatture associate a questa commessa.' : 'Emetti la prima fattura.'}
          action={<Link href="/ufficio/fatture/nuova" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuova fattura</Link>}
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
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
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors truncate">{f.cliente?.nome ?? 'â€”'}</span>
                      <Badge variant={BADGE_VARIANT[f.stato] ?? 'neutral'}>{LABEL[f.stato] ?? f.stato}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.commessa?.nome ?? 'Senza commessa'}
                      {f.dataScadenza ? ` Â· Scad. ${formatData(f.dataScadenza)}` : ''}
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

