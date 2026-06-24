import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { getInvoiceAmounts, deriveInvoiceStatus } from '@/lib/finance'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

const BADGE_VARIANT: Record<string, BadgeVariant> = {
  da_incassare: 'warning',
  parzialmente_incassata: 'warning',
  incassata: 'success',
  scaduta: 'danger',
}
const LABEL: Record<string, string> = {
  da_incassare: 'Da incassare',
  parzialmente_incassata: 'Parz. incassata',
  incassata: 'Incassata',
  scaduta: 'Scaduta',
}

export default async function FattureAttivePage({
  searchParams,
}: {
  searchParams: Promise<{ commessaId?: string; clienteId?: string }>
}) {
  await requireImpresa()
  const { commessaId, clienteId } = await searchParams

  const where: Record<string, unknown> = {}
  if (commessaId) where.commessaId = commessaId
  if (clienteId) where.clienteId = clienteId

  // Risolvi label del filtro attivo
  let filtroLabel: string | null = null
  let filtroHref: string | null = null
  if (commessaId) {
    const c = await prisma.commessa.findUnique({ where: { id: commessaId }, select: { id: true, nome: true } })
    if (c) {
      filtroLabel = `Commessa: ${c.nome}`
      filtroHref = `/impresa/commesse/${c.id}`
    }
  } else if (clienteId) {
    const cl = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true, nome: true } })
    if (cl) {
      filtroLabel = `Cliente: ${cl.nome}`
      filtroHref = `/impresa/clienti/${cl.id}`
    }
  }

  const fatture = await prisma.fatturaAttiva.findMany({
    where,
    include: {
      cliente: { select: { nome: true } },
      commessa: { select: { nome: true } },
      righe: true,
    },
    orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
  })

  const parsedFatture = fatture.map(f => {
    const { totalAmount, paidOrCollectedAmount, residualAmount } = getInvoiceAmounts({
      type: 'attiva',
      aliquotaIva: f.aliquotaIva,
      importoIncassato: f.importoIncassato,
      righe: f.righe,
    })
    const derivedStatus = deriveInvoiceStatus({
      type: 'attiva',
      totalAmount,
      paidOrCollectedAmount,
      dataScadenza: f.dataScadenza,
    })
    return {
      ...f,
      totalAmount,
      paidOrCollectedAmount,
      residualAmount,
      derivedStatus,
    }
  })

  const totaleDaIncassare = parsedFatture
    .filter(f => f.derivedStatus !== 'incassata')
    .reduce((acc, f) => acc + f.residualAmount, 0)

  const scadute = parsedFatture.filter(f => f.derivedStatus === 'scaduta').length

  return (
    <div>
      <PageHeader
        title="Fatture attive"
        subtitle={`${fatture.length} ${fatture.length === 1 ? 'fattura' : 'fatture'} emesse${scadute > 0 ? ` · ${scadute} scadute` : ''}`}
        action={
          <Link
            href="/impresa/fatture/nuova"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuova
          </Link>
        }
      />

      {/* Breadcrumb filtro attivo */}
      {filtroLabel && (
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {filtroLabel}
          </span>
          <Link href="/impresa/fatture" className="text-xs text-gray-400 hover:text-gray-600">
            × Rimuovi filtro
          </Link>
          {filtroHref && (
            <Link href={filtroHref} className="text-xs text-blue-500 hover:text-blue-700">
              ← Torna alla scheda
            </Link>
          )}
        </div>
      )}

      {totaleDaIncassare > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Totale da incassare
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-0.5">
              {formatEuro(totaleDaIncassare)}
            </p>
          </div>
          {scadute > 0 && (
            <Badge variant="danger">
              {scadute} scadut{scadute === 1 ? 'a' : 'e'}
            </Badge>
          )}
        </div>
      )}

      {parsedFatture.length === 0 ? (
        <EmptyState
          icon="/immagini/icona-finanza.png"
          title={filtroLabel ? 'Nessuna fattura per questo filtro' : 'Nessuna fattura'}
          description={filtroLabel ? 'Non ci sono fatture associate.' : 'Emetti la prima fattura da una commessa o da questa schermata.'}
          action={
            <Link
              href="/impresa/fatture/nuova"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuova fattura
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {parsedFatture.map(f => {
              return (
                <Link
                  key={f.id}
                  href={`/impresa/fatture/${f.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group"
                >
                  {/* Numero fattura */}
                  <div className="shrink-0 text-center w-14">
                    <p className="text-base font-bold text-gray-900 leading-none">
                      {f.numero}/{f.anno}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatData(f.data)}</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                        {f.cliente?.nome ?? '—'}
                      </span>
                      <Badge variant={BADGE_VARIANT[f.derivedStatus] ?? 'neutral'}>
                        {LABEL[f.derivedStatus] ?? f.derivedStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.commessa?.nome ?? 'Senza commessa'}
                      {f.dataScadenza ? ` · Scad. ${formatData(f.dataScadenza)}` : ''}
                    </p>
                  </div>

                  {/* Totale */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatEuro(f.totalAmount)}
                    </p>
                    {f.derivedStatus === 'parzialmente_incassata' && (
                      <p className="text-xs text-orange-600 font-medium">Residuo: {formatEuro(f.residualAmount)}</p>
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
