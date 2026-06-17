import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

const STATO_LABEL: Record<string, string> = {
  richiesto: 'Da ordinare',
  ordinato: 'Ordinato',
  consegnato: 'Consegnato',
  usato: 'Usato',
}
const STATO_COLOR: Record<string, string> = {
  richiesto: 'bg-gray-100 text-gray-700',
  ordinato: 'bg-yellow-100 text-yellow-700',
  consegnato: 'bg-green-100 text-green-700',
  usato: 'bg-blue-100 text-blue-700',
}

export default async function OrdiniPage() {
  await requireImpresa()

  const ordini = await prisma.ordineFornitore.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fornitore: { select: { nome: true } },
      commessa: { select: { nome: true } },
      righe: true,
    },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordini materiale</h1>
          <p className="mt-1 text-sm text-gray-500">{ordini.length} ordini totali</p>
        </div>
        <Link
          href="/impresa/ordini/nuovo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nuovo ordine
        </Link>
      </div>

      {ordini.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessun ordine. Crea il primo ordine a un fornitore.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordini.map(o => {
            const totale = o.righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
            return (
              <Link
                key={o.id}
                href={`/impresa/ordini/${o.id}`}
                className="block rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {o.fornitore?.nome ?? 'Fornitore non specificato'}
                    </p>
                    {o.commessa && (
                      <p className="text-sm text-gray-500 mt-0.5">Commessa: {o.commessa.nome}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatData(o.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATO_COLOR[o.stato]}`}>
                      {STATO_LABEL[o.stato]}
                    </span>
                    <p className="text-sm font-semibold text-gray-700">{formatEuro(totale)}</p>
                    <p className="text-xs text-gray-400">{o.righe.length} {o.righe.length === 1 ? 'riga' : 'righe'}</p>
                  </div>
                </div>
                {o.note && <p className="mt-2 text-xs text-gray-500 italic">{o.note}</p>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
