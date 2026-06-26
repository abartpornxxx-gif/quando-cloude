import { requireCliente } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData, formatEuro } from '@/lib/format'

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
          foto: { 
            where: { visibileCliente: true },
            orderBy: { createdAt: 'asc' } 
          },
          rapportino: true,
          operaio: { select: { nome: true } },
        },
        orderBy: { data: 'desc' },
        take: 30,
      },
      varianti: {
        where: { visibileCliente: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  // Verifica proprietà — il cliente vede SOLO le proprie commesse
  if (!commessa || commessa.clienteId !== cliente.id) notFound()

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const c = commessa!

  const perc = c.avanzamentoPercentuale ?? 0

  // Raccoglie tutte le foto dalle giornate
  const tutteFoto = c.giornate.flatMap(g =>
    g.foto.map(f => ({ url: f.url, data: g.data, operaio: g.operaio?.nome }))
  )

  // Calcola lo stato del cantiere in quel momento per animare la barra
  // (es. l'operaio sta lavorando ora?)
  const oggi = new Date()
  const oggiStr = formatData(oggi)
  const giornataOggi = c.giornate.find(g => formatData(g.data) === oggiStr)
  const inPausa = giornataOggi?.fase === 'pausa'
  const inLavoro = giornataOggi?.fase === 'mattina' || giornataOggi?.fase === 'pomeriggio'
  
  const workerStatus = c.stato === 'chiusa' || c.stato === 'finita' ? '🎉 Lavori conclusi!' : 
                       inPausa ? '☕ Operaio in pausa' :
                       inLavoro ? '🔨 Lavori in corso ora...' :
                       '🚧 Cantiere in attesa'

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/cliente/lavori" className="text-violet-600 hover:text-violet-800 text-sm">‹ Lavori</Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1 truncate">{c.nome}</h1>
        <span className={`shrink-0 text-xs rounded-full px-2 py-1 font-medium ${c.stato === 'chiusa' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
          {c.stato === 'chiusa' ? '✓ Completato' : 'In corso'}
        </span>
      </div>

      {c.indirizzoCantiere && (
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <span className="text-gray-400">📍</span>
          {c.indirizzoCantiere}
        </p>
      )}

      {/* Barra avanzamento con animazione */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-md p-5 relative overflow-hidden">
        <div className="flex justify-between items-end mb-8 relative z-10">
          <div>
            <span className="block font-bold text-gray-800 text-lg">Avanzamento Lavori</span>
            <span className="block text-sm text-violet-600 font-medium mt-1">{workerStatus}</span>
          </div>
          <span className="text-3xl font-black text-violet-800">{perc}%</span>
        </div>
        
        {/* Track */}
        <div className="h-4 bg-violet-100/50 rounded-full w-full relative">
          {/* Fill animato */}
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
            style={{ 
              width: `${Math.max(perc, 5)}%`, 
              background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
            }}
          >
            {/* Animazione striped */}
            {inLavoro && (
              <div className="absolute inset-0 rounded-full opacity-20 bg-[length:20px_20px]" 
                   style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)', animation: 'progress-stripes 2s linear infinite' }} />
            )}
          </div>
          
          {/* Mascotte/Operaio che cammina sulla barra */}
          <div 
            className="absolute -top-8 transition-all duration-1000 ease-out"
            style={{ left: `calc(${perc}% - 16px)` }}
          >
            <div className={`text-3xl drop-shadow-md transition-transform ${inLavoro ? 'animate-bounce' : ''}`}>
              {c.stato === 'chiusa' || c.stato === 'finita' ? '🏁' : inPausa ? '☕' : '👷‍♂️'}
            </div>
          </div>
        </div>

        {/* CSS custom locale per l'animazione */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes progress-stripes {
            from { background-position: 40px 0; }
            to { background-position: 0 0; }
          }
        `}} />
      </div>

      {/* Varianti lavori */}
      {c.varianti && c.varianti.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Varianti lavori (Extra)</h2>
          <div className="space-y-3">
            {c.varianti.map(v => (
              <div key={v.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{v.titolo}</p>
                  {v.descrizione && <p className="text-xs text-gray-500 mt-1">{v.descrizione}</p>}
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Data: {formatData(v.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-violet-700">{formatEuro(v.importo)}</p>
                    <span className={`inline-block text-[10px] rounded-full px-2 py-0.5 font-semibold mt-1 ${
                      v.stato === 'approvata' ? 'bg-green-100 text-green-800' :
                      v.stato === 'rifiutata' ? 'bg-red-100 text-red-800' :
                      v.stato === 'inviata' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {v.stato === 'approvata' ? 'Approvata' :
                       v.stato === 'rifiutata' ? 'Rifiutata' :
                       v.stato === 'inviata' ? 'Inviata' :
                       v.stato === 'bozza' ? 'Bozza' : 'Annullata'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
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
