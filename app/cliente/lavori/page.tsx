import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

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

  function avanzamento(c: typeof commesse[0]) {
    if (c.stato === 'chiusa') return 100
    if (c.preventivato <= 0) return null
    const costi = c.costiManodopera + c.costiMateriali + c.costiMezzi
    return Math.min(100, Math.round((costi / c.preventivato) * 100))
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">I miei lavori</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {commesse.filter(c => c.stato === 'aperta').length > 0
            ? `${commesse.filter(c => c.stato === 'aperta').length} in corso · ${commesse.filter(c => c.stato === 'chiusa').length} completati`
            : `${commesse.length} lavori totali`}
        </p>
      </div>

      {commesse.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title="Nessun cantiere"
          description="Non ci sono ancora lavori associati al tuo account. Contatta l'impresa per informazioni."
        />
      ) : (
        <div className="space-y-4">
          {commesse.map(c => {
            const perc = avanzamento(c)
            const ultimaGiornata = c.giornate[0]
            const barColor =
              perc === null
                ? 'bg-gray-300'
                : perc >= 100
                ? 'bg-green-500'
                : perc >= 60
                ? 'bg-blue-500'
                : 'bg-violet-500'

            return (
              <Link
                key={c.id}
                href={`/cliente/lavori/${c.id}`}
                className="block rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-violet-200 hover:shadow-md transition-all overflow-hidden group"
              >
                {/* Foto copertina */}
                {ultimaGiornata?.foto[0] && (
                  <div className="relative overflow-hidden h-36">
                    <img
                      src={ultimaGiornata.foto[0].url}
                      alt="Foto cantiere"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <Badge variant={c.stato === 'chiusa' ? 'success' : 'info'}>
                        {c.stato === 'chiusa' ? '✓ Completato' : 'In corso'}
                      </Badge>
                    </div>
                  </div>
                )}
                <div className="p-4 sm:p-5">
                  {!ultimaGiornata?.foto[0] && (
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div />
                      <Badge variant={c.stato === 'chiusa' ? 'success' : 'info'}>
                        {c.stato === 'chiusa' ? '✓ Completato' : 'In corso'}
                      </Badge>
                    </div>
                  )}
                  <h2 className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors">
                    {c.nome}
                  </h2>
                  {c.indirizzoCantiere && (
                    <p className="text-xs text-gray-500 mt-0.5">📍 {c.indirizzoCantiere}</p>
                  )}

                  {/* Barra avanzamento */}
                  {perc !== null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Avanzamento lavori</span>
                        <span className="font-semibold text-gray-700">{perc}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
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
                        {ultimaGiornata.operaio?.nome
                          ? ` · ${ultimaGiornata.operaio.nome}`
                          : ''}
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
      )}
    </div>
  )
}
