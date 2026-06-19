import { requireCliente } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { formatEuro, formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

const BADGE_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  da_incassare: { variant: 'warning', label: 'Da pagare' },
  incassata: { variant: 'success', label: 'Pagata ✓' },
  scaduta: { variant: 'danger', label: 'Scaduta' },
}

export default async function ClientePagamentiPage() {
  const { cliente } = await requireCliente()

  const fatture = await prisma.fatturaAttiva.findMany({
    where: { clienteId: cliente.id },
    include: {
      righe: true,
      commessa: { select: { nome: true } },
    },
    orderBy: [{ stato: 'asc' }, { data: 'desc' }],
  })

  const iban = process.env.IMPRESA_IBAN
  const intestatario = process.env.IMPRESA_RAGIONE_SOCIALE ?? ''

  function totale(righe: { quantita: number; prezzoUnitario: number }[], iva: number) {
    const imp = righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
    return imp + Math.round((imp * iva) / 100)
  }

  const totaleDaPagare = fatture
    .filter(f => f.stato !== 'incassata')
    .reduce((acc, f) => acc + totale(f.righe, f.aliquotaIva), 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagamenti</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {fatture.length} {fatture.length === 1 ? 'fattura' : 'fatture'}
          {fatture.filter(f => f.stato !== 'incassata').length > 0
            ? ` · ${fatture.filter(f => f.stato !== 'incassata').length} da pagare`
            : ' · tutto in regola ✓'}
        </p>
      </div>

      {/* Totale da pagare */}
      {totaleDaPagare > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
            Totale da pagare
          </p>
          <p className="text-3xl font-bold text-amber-900 mt-1">{formatEuro(totaleDaPagare)}</p>
          <p className="text-sm text-amber-700 mt-1">
            Pagamento tramite <strong>bonifico bancario</strong>
          </p>
        </div>
      )}

      {/* Info IBAN */}
      {iban && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 space-y-2">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">
            Coordinate per il bonifico
          </p>
          {intestatario && (
            <p className="text-sm text-blue-900">
              <span className="text-blue-500">Intestatario:</span> {intestatario}
            </p>
          )}
          <p className="font-mono text-base font-bold text-blue-900 break-all">{iban}</p>
          <p className="text-xs text-blue-600">
            Indicare nella causale il numero della fattura
          </p>
        </div>
      )}

      {fatture.length === 0 ? (
        <EmptyState
          icon="/immagini/icona-pagamenti.png"
          title="Nessuna fattura"
          description="Non ci sono ancora fatture associate al tuo account."
        />
      ) : (
        <div className="space-y-3">
          {fatture.map(f => {
            const tot = totale(f.righe, f.aliquotaIva)
            const badge = BADGE_MAP[f.stato] ?? BADGE_MAP.da_incassare
            const isScaduta =
              f.stato === 'scaduta' ||
              (f.stato === 'da_incassare' &&
                f.dataScadenza != null &&
                new Date(f.dataScadenza) < new Date())

            return (
              <div
                key={f.id}
                className={`rounded-2xl border bg-white shadow-sm p-5 ${
                  isScaduta ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">
                        Fattura n. {f.numero}/{f.anno}
                      </p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {f.commessa && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cantiere: {f.commessa.nome}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Emessa: {formatData(f.data)}
                      {f.dataScadenza ? ` · Scadenza: ${formatData(f.dataScadenza)}` : ''}
                    </p>
                    {f.stato === 'incassata' && f.dataIncasso && (
                      <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                        ✓ Ricevuto il {formatData(f.dataIncasso)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-gray-900">{formatEuro(tot)}</p>
                    <p className="text-xs text-gray-400">IVA {f.aliquotaIva}%</p>
                  </div>
                </div>

                {/* Causale suggerita */}
                {f.stato !== 'incassata' && iban && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Causale:{' '}
                      <span className="font-mono text-gray-700 text-xs">
                        Fattura n. {f.numero}/{f.anno}
                        {intestatario ? ` – ${intestatario}` : ''}
                      </span>
                    </p>
                  </div>
                )}

                {/* Righe */}
                {f.righe.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {f.righe.map(r => (
                      <div key={r.id} className="flex justify-between text-xs text-gray-500">
                        <span className="truncate flex-1 mr-2">{r.descrizione}</span>
                        <span className="shrink-0">
                          {formatEuro(Math.round(r.quantita * r.prezzoUnitario))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!iban && fatture.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Per le coordinate bancarie, contatta l&apos;impresa.
        </p>
      )}
    </div>
  )
}
