import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { toggleAttiva, eliminaOfferta } from './actions'

export default async function CatalogoPaginaImpresa() {
  await requireImpresa()

  const offerte = await prisma.offertaCatalogo.findMany({
    orderBy: [{ ordine: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { richieste: true } } },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogo offerte</h1>
          <p className="mt-1 text-sm text-gray-500">{offerte.length} offerte · visibili ai clienti nel portale</p>
        </div>
        <Link
          href="/impresa/catalogo/nuovo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nuova offerta
        </Link>
      </div>

      {offerte.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-2xl mb-2">🛍</p>
          <p className="text-gray-600 font-medium">Nessuna offerta ancora</p>
          <p className="text-sm text-gray-400 mt-1">Crea offerte per mostrarle ai clienti nel loro portale</p>
          <Link href="/impresa/catalogo/nuovo" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + Crea la prima offerta
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerte.map(o => (
          <div key={o.id} className={`rounded-xl border bg-white shadow-sm overflow-hidden ${o.attiva ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}>
            {o.fotoUrl ? (
              <img src={o.fotoUrl} alt={o.titolo} className="h-40 w-full object-cover" />
            ) : (
              <div className="h-40 bg-gray-100 flex items-center justify-center">
                <span className="text-4xl">🔌</span>
              </div>
            )}
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{o.titolo}</h3>
                  {o.categoria && <p className="text-xs text-gray-500">{o.categoria}</p>}
                </div>
                <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${o.attiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {o.attiva ? 'Attiva' : 'Nascosta'}
                </span>
              </div>

              {o.prezzoDa != null && (
                <p className="text-sm font-semibold text-blue-700">A partire da {formatEuro(o.prezzoDa)}</p>
              )}

              {o.descrizione && (
                <p className="text-xs text-gray-600 line-clamp-2">{o.descrizione}</p>
              )}

              {o._count.richieste > 0 && (
                <Link href="/impresa/richieste-offerte" className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium hover:underline">
                  📬 {o._count.richieste} {o._count.richieste === 1 ? 'richiesta' : 'richieste'}
                </Link>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <Link
                  href={`/impresa/catalogo/${o.id}/edit`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Modifica
                </Link>
                <span className="text-gray-300">·</span>
                <form action={toggleAttiva.bind(null, o.id, !o.attiva)} className="inline">
                  <button type="submit" className="text-xs text-gray-500 hover:text-gray-700">
                    {o.attiva ? 'Nascondi' : 'Attiva'}
                  </button>
                </form>
                <span className="text-gray-300">·</span>
                <form action={eliminaOfferta.bind(null, o.id)} className="inline">
                  <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                    Elimina
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
