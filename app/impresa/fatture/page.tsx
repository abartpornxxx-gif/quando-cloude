import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

const BADGE: Record<string, string> = {
  da_incassare: 'bg-yellow-100 text-yellow-800',
  incassata: 'bg-green-100 text-green-800',
  scaduta: 'bg-red-100 text-red-800',
}
const LABEL: Record<string, string> = {
  da_incassare: 'Da incassare',
  incassata: 'Incassata',
  scaduta: 'Scaduta',
}

export default async function FattureAttivePage() {
  await requireImpresa()

  const fatture = await prisma.fatturaAttiva.findMany({
    include: {
      cliente: { select: { nome: true } },
      commessa: { select: { nome: true } },
      righe: true,
    },
    orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
  })

  function totaleImponibile(righe: { quantita: number; prezzoUnitario: number }[]) {
    return righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
  }

  const totaleDaIncassare = fatture
    .filter(f => f.stato === 'da_incassare' || f.stato === 'scaduta')
    .reduce((acc, f) => acc + totaleImponibile(f.righe), 0)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Fatture attive</h1>
        <Link
          href="/impresa/fatture/nuova"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nuova fattura
        </Link>
      </div>

      {totaleDaIncassare > 0 && (
        <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm font-semibold text-yellow-800">
            Totale da incassare: <span className="text-lg">{formatEuro(totaleDaIncassare)}</span>
          </p>
        </div>
      )}

      {fatture.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna fattura emessa ancora.</p>
      )}

      <div className="bg-white rounded-xl border divide-y">
        {fatture.map(f => {
          const imponibile = totaleImponibile(f.righe)
          const iva = Math.round(imponibile * f.aliquotaIva / 100)
          return (
            <Link
              key={f.id}
              href={`/impresa/fatture/${f.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">
                    n. {f.numero}/{f.anno}
                  </p>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${BADGE[f.stato]}`}>
                    {LABEL[f.stato]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {f.cliente?.nome ?? '—'} · {f.commessa?.nome ? `Commessa: ${f.commessa.nome}` : ''}
                </p>
                <p className="text-xs text-gray-400">
                  Emessa: {formatData(f.data)}
                  {f.dataScadenza ? ` · Scadenza: ${formatData(f.dataScadenza)}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="font-semibold text-sm">{formatEuro(imponibile + iva)}</p>
                <p className="text-xs text-gray-400">IVA {f.aliquotaIva}%: {formatEuro(iva)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
