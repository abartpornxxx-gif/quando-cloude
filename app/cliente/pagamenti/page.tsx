import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatEuro, formatData } from '@/lib/format'

const BADGE: Record<string, { cls: string; label: string }> = {
  da_incassare: { cls: 'bg-yellow-100 text-yellow-800', label: 'Da pagare' },
  incassata: { cls: 'bg-green-100 text-green-800', label: 'Pagata ✓' },
  scaduta: { cls: 'bg-red-100 text-red-800', label: 'Scaduta' },
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
    return imp + Math.round(imp * iva / 100)
  }

  const totaleDaPagare = fatture
    .filter(f => f.stato !== 'incassata')
    .reduce((acc, f) => acc + totale(f.righe, f.aliquotaIva), 0)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Pagamenti</h1>

      {/* Totale da pagare */}
      {totaleDaPagare > 0 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-semibold text-yellow-800">
            Totale da pagare: <span className="text-xl">{formatEuro(totaleDaPagare)}</span>
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Metodo di pagamento: <strong>bonifico bancario</strong>
          </p>
        </div>
      )}

      {/* Info IBAN */}
      {iban && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-1">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Coordinate bancarie per il bonifico</p>
          <div className="space-y-1 text-sm">
            {intestatario && (
              <p className="text-blue-900"><span className="text-blue-600">Intestatario:</span> {intestatario}</p>
            )}
            <p className="font-mono text-blue-900 font-semibold text-base">{iban}</p>
            <p className="text-xs text-blue-600">
              Indicare nella causale il numero della fattura
            </p>
          </div>
        </div>
      )}

      {fatture.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💳</div>
          <p className="text-gray-400 text-sm">Nessuna fattura emessa ancora.</p>
        </div>
      )}

      {/* Lista fatture */}
      <div className="space-y-3">
        {fatture.map(f => {
          const tot = totale(f.righe, f.aliquotaIva)
          const badge = BADGE[f.stato] ?? BADGE.da_incassare
          const isScaduta = f.stato === 'scaduta' || (
            f.stato === 'da_incassare' && f.dataScadenza && new Date(f.dataScadenza) < new Date()
          )
          return (
            <div
              key={f.id}
              className={`rounded-xl border bg-white shadow-sm p-4 ${isScaduta ? 'border-red-200' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">
                      Fattura n. {f.numero}/{f.anno}
                    </p>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  {f.commessa && (
                    <p className="text-xs text-gray-500 mt-0.5">Cantiere: {f.commessa.nome}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Emessa: {formatData(f.data)}
                    {f.dataScadenza ? ` · Scadenza: ${formatData(f.dataScadenza)}` : ''}
                  </p>
                  {f.stato === 'incassata' && f.dataIncasso && (
                    <p className="text-xs text-green-700 mt-0.5">Ricevuto il: {formatData(f.dataIncasso)}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">{formatEuro(tot)}</p>
                  <p className="text-xs text-gray-400">IVA {f.aliquotaIva}%</p>
                </div>
              </div>

              {/* Causale suggerita */}
              {f.stato !== 'incassata' && iban && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Causale bonifico suggerita:{' '}
                    <span className="font-mono text-gray-700">
                      Fattura n. {f.numero}/{f.anno} – {intestatario}
                    </span>
                  </p>
                </div>
              )}

              {/* Righe dettaglio */}
              <div className="mt-3 space-y-1">
                {f.righe.map(r => (
                  <div key={r.id} className="flex justify-between text-xs text-gray-500">
                    <span className="truncate flex-1 mr-2">{r.descrizione}</span>
                    <span className="shrink-0">{formatEuro(Math.round(r.quantita * r.prezzoUnitario))}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!iban && fatture.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Per le coordinate bancarie, contatta l&apos;impresa.
        </p>
      )}
    </div>
  )
}
