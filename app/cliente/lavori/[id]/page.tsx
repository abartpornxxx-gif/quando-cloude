import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData } from '@/lib/format'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteCommessaPage({ params }: Props) {
  const { cliente } = await requireCliente()
  const { id } = await params

  const commessa = await prisma.commessa.findUnique({
    where: { id },
    include: {
      giornate: {
        include: {
          foto: { orderBy: { createdAt: 'asc' } },
          rapportino: true,
          operaio: { select: { nome: true } },
        },
        orderBy: { data: 'desc' },
        take: 30,
      },
    },
  })

  // Verifica proprietà — il cliente vede SOLO le proprie commesse
  if (!commessa || commessa.clienteId !== cliente.id) notFound()

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const c = commessa!

  function avanzamento() {
    if (c.stato === 'chiusa') return 100
    if (c.preventivato <= 0) return null
    const costi = c.costiManodopera + c.costiMateriali + c.costiMezzi
    return Math.min(100, Math.round(costi / c.preventivato * 100))
  }

  const perc = avanzamento()

  // Raccoglie tutte le foto dalle giornate
  const tutteFoto = c.giornate.flatMap(g =>
    g.foto.map(f => ({ url: f.url, data: g.data, operaio: g.operaio?.nome }))
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/cliente/lavori" className="text-violet-600 hover:text-violet-800 text-sm">‹ Lavori</Link>
        <h1 className="text-xl font-bold flex-1 truncate">{c.nome}</h1>
        <span className={`shrink-0 text-xs rounded-full px-2 py-1 font-medium ${c.stato === 'chiusa' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {c.stato === 'chiusa' ? '✓ Completato' : 'In corso'}
        </span>
      </div>

      {c.indirizzoCantiere && (
        <p className="text-sm text-gray-500">📍 {c.indirizzoCantiere}</p>
      )}

      {/* Barra avanzamento */}
      {perc !== null && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-gray-700">Avanzamento lavori</span>
            <span className="font-bold text-violet-700">{perc}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${perc >= 100 ? 'bg-green-500' : perc >= 50 ? 'bg-blue-500' : 'bg-violet-500'}`}
              style={{ width: `${perc}%` }}
            />
          </div>
        </div>
      )}

      {/* Diario lavori */}
      {c.giornate.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Diario dei lavori</h2>
          <div className="space-y-3">
            {c.giornate.map(g => (
              <div key={g.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatData(g.data)}</p>
                    {g.operaio?.nome && <p className="text-xs text-gray-500">{g.operaio.nome}</p>}
                  </div>
                  {g.foto.length > 0 && (
                    <span className="text-xs text-gray-400">{g.foto.length} foto</span>
                  )}
                </div>
                {g.rapportino?.lavoroEseguito && (
                  <p className="text-sm text-gray-700">{g.rapportino.lavoroEseguito}</p>
                )}
                {g.rapportino?.lavoriExtra && (
                  <p className="text-xs text-violet-600 mt-1">Extra: {g.rapportino.lavoriExtra}</p>
                )}
                {/* Foto giornata */}
                {g.foto.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-1">
                    {g.foto.slice(0, 6).map(f => (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                        <img
                          src={f.url}
                          alt="Foto cantiere"
                          className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Galleria foto compatta */}
      {tutteFoto.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Tutte le foto ({tutteFoto.length})
          </h2>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
            {tutteFoto.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer">
                <img
                  src={f.url}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {c.giornate.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          Nessuna attività registrata ancora.
        </div>
      )}
    </div>
  )
}
