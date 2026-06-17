import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import PrintButton from './PrintButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteFatturaPage({ params }: Props) {
  const { cliente } = await requireCliente()
  const { id } = await params

  const fattura = await prisma.fatturaAttiva.findUnique({
    where: { id },
    include: {
      righe: { orderBy: { ordine: 'asc' } },
      commessa: { select: { nome: true } },
    },
  })

  // Verifica proprietà — il cliente vede SOLO le proprie fatture
  if (!fattura || fattura.clienteId !== cliente.id) notFound()

  const imponibile = fattura.righe.reduce(
    (acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario),
    0
  )
  const iva = Math.round(imponibile * fattura.aliquotaIva / 100)
  const tot = imponibile + iva

  const impresaNome = process.env.IMPRESA_RAGIONE_SOCIALE ?? ''
  const impresaPiva = process.env.IMPRESA_PARTITA_IVA ?? ''
  const impresaIndirizzo = process.env.IMPRESA_INDIRIZZO ?? ''
  const impresaIban = process.env.IMPRESA_IBAN ?? ''

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          nav { display: none !important; }
        }
      `}</style>

      <div className="space-y-4">
        {/* Toolbar — nascosta in stampa */}
        <div className="no-print flex items-center gap-3">
          <Link href="/cliente/documenti" className="text-violet-600 hover:text-violet-800 text-sm">
            ‹ Documenti
          </Link>
          <PrintButton />
        </div>

        {/* Fattura */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          {/* Header */}
          <div className="flex justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">FATTURA</h1>
              <p className="text-sm text-gray-600">n. {fattura.numero}/{fattura.anno}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-500">Data emissione</p>
              <p className="font-semibold">{formatData(fattura.data)}</p>
              {fattura.dataScadenza && (
                <>
                  <p className="text-gray-500 mt-1">Scadenza</p>
                  <p className={`font-semibold ${fattura.stato !== 'incassata' && new Date(fattura.dataScadenza) < new Date() ? 'text-red-600' : ''}`}>
                    {formatData(fattura.dataScadenza)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Cedente / Cessionario */}
          <div className="grid grid-cols-2 gap-6 border-t border-b border-gray-100 py-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Emessa da</p>
              {impresaNome && <p className="font-semibold text-sm">{impresaNome}</p>}
              {impresaPiva && <p className="text-xs text-gray-500">P.IVA: {impresaPiva}</p>}
              {impresaIndirizzo && <p className="text-xs text-gray-500">{impresaIndirizzo}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Intestata a</p>
              <p className="font-semibold text-sm">{cliente.nome}</p>
              {cliente.partitaIva && <p className="text-xs text-gray-500">P.IVA: {cliente.partitaIva}</p>}
              {cliente.codiceFiscale && <p className="text-xs text-gray-500">C.F.: {cliente.codiceFiscale}</p>}
              {cliente.indirizzo && <p className="text-xs text-gray-500">{cliente.indirizzo}</p>}
            </div>
          </div>

          {fattura.commessa && (
            <p className="text-xs text-gray-500">Cantiere: <span className="font-medium">{fattura.commessa.nome}</span></p>
          )}

          {/* Righe */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs text-gray-500 font-medium">Descrizione</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">Qtà</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">Prezzo</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">Totale</th>
              </tr>
            </thead>
            <tbody>
              {fattura.righe.map(r => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="py-2 pr-2">{r.descrizione}</td>
                  <td className="py-2 text-right text-gray-600">{r.quantita}</td>
                  <td className="py-2 text-right text-gray-600">{formatEuro(r.prezzoUnitario)}</td>
                  <td className="py-2 text-right font-medium">{formatEuro(Math.round(r.quantita * r.prezzoUnitario))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-1 text-right text-xs text-gray-500">Imponibile</td>
                <td className="py-1 text-right text-sm font-semibold">{formatEuro(imponibile)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1 text-right text-xs text-gray-500">IVA {fattura.aliquotaIva}%</td>
                <td className="py-1 text-right text-sm font-semibold">{formatEuro(iva)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="py-2 text-right font-bold">Totale</td>
                <td className="py-2 text-right font-bold text-lg">{formatEuro(tot)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Stato */}
          {fattura.stato === 'incassata' ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800 font-medium">
              ✓ Pagata il {formatData(fattura.dataIncasso)}
            </div>
          ) : (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-blue-800">Come pagare</p>
              <p className="text-xs text-blue-700">Metodo: bonifico bancario</p>
              {impresaIban && (
                <p className="text-xs text-blue-700 font-mono font-semibold">{impresaIban}</p>
              )}
              {impresaNome && (
                <p className="text-xs text-blue-700">Intestatario: {impresaNome}</p>
              )}
              <p className="text-xs text-blue-600">
                Causale: <span className="font-mono">Fattura n. {fattura.numero}/{fattura.anno}</span>
              </p>
            </div>
          )}

          {fattura.note && (
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">Note: {fattura.note}</p>
          )}
        </div>
      </div>
    </>
  )
}
