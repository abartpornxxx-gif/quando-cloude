import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatData } from '@/lib/format'

export default async function ClienteLavoriPage() {
  const { cliente } = await requireCliente()

  const commesse = await prisma.commessa.findMany({
    where: { clienteId: cliente.id },
    include: {
      giornate: {
        include: {
          foto: { take: 1, orderBy: { createdAt: 'desc' } },
          rapportino: true,
          operaio: { select: { nome: true } },
        },
        orderBy: { data: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ stato: 'asc' }, { createdAt: 'desc' }],
  })

  if (commesse.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🏗</div>
        <p className="text-gray-500">Nessun cantiere trovato.</p>
      </div>
    )
  }

  function avanzamento(c: typeof commesse[0]) {
    if (c.stato === 'chiusa') return 100
    if (c.preventivato <= 0) return null
    const costi = c.costiManodopera + c.costiMateriali + c.costiMezzi
    return Math.min(100, Math.round(costi / c.preventivato * 100))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">I miei lavori</h1>
      <div className="space-y-4">
        {commesse.map(c => {
          const perc = avanzamento(c)
          const ultimaGiornata = c.giornate[0]
          return (
            <Link
              key={c.id}
              href={`/cliente/lavori/${c.id}`}
              className="block rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Foto di copertina */}
              {ultimaGiornata?.foto[0] && (
                <img
                  src={ultimaGiornata.foto[0].url}
                  alt="Foto cantiere"
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900">{c.nome}</h2>
                    {c.indirizzoCantiere && (
                      <p className="text-xs text-gray-500 mt-0.5">{c.indirizzoCantiere}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs rounded-full px-2 py-1 font-medium ${c.stato === 'chiusa' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {c.stato === 'chiusa' ? '✓ Completato' : 'In corso'}
                  </span>
                </div>

                {/* Barra avanzamento */}
                {perc !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Avanzamento lavori</span>
                      <span className="font-medium">{perc}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${perc >= 100 ? 'bg-green-500' : perc >= 50 ? 'bg-blue-500' : 'bg-violet-500'}`}
                        style={{ width: `${perc}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Ultima attività */}
                {ultimaGiornata && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Ultima attività: {formatData(ultimaGiornata.data)}
                      {ultimaGiornata.operaio?.nome ? ` · ${ultimaGiornata.operaio.nome}` : ''}
                    </p>
                    {ultimaGiornata.rapportino?.lavoroEseguito && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {ultimaGiornata.rapportino.lavoroEseguito}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
