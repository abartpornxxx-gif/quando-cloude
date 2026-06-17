import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import GiornateMonitor from './GiornateMonitor'

export default async function GiornateImpresaPage() {
  await requireImpresa()

  const [giornate, config] = await Promise.all([
    prisma.giornata.findMany({
      include: {
        operaio: { select: { nome: true } },
        commessa: { select: { nome: true } },
        rapportino: true,
        ore: true,
        foto: { select: { url: true }, take: 1 },
      },
      orderBy: { data: 'desc' },
      take: 100,
    }),
    prisma.configurazioneOrari.findFirst(),
  ])

  const cfg = config ?? { durataMattinaMinuti: 240, durataPausaMinuti: 60, durataPomeriggioMinuti: 240 }

  // ORDINE 1 — Giornate attive (non ancora chiuse): countdown visibile SOLO all'impresa
  const giornateAttive = giornate
    .filter(g => g.stato === 'bozza' && g.fase !== 'completata')
    .map(g => ({
      id: g.id,
      operaioNome: g.operaio.nome,
      commessaNome: g.commessa.nome,
      fase: g.fase,
      inizioMattina: g.inizioMattina?.toISOString() ?? null,
      fineMattina: g.fineMattina?.toISOString() ?? null,
      inizioPomeriggio: g.inizioPomeriggio?.toISOString() ?? null,
    }))

  // ORDINE 4 — Rapportini mancanti: giornate in fase 'fine' senza rapportino
  const rapportiniMancanti = giornate.filter(g => g.fase === 'fine' && !g.rapportino)

  function totaleOre(ore: { quantita: number; tipo: string }[]) {
    const ord = ore.filter(o => o.tipo === 'ordinaria').reduce((s, o) => s + o.quantita, 0)
    const str = ore.filter(o => o.tipo === 'straordinaria').reduce((s, o) => s + o.quantita, 0)
    return { ord, str }
  }

  // Solo giornate chiuse nella lista storica
  const giornateChiuse = giornate.filter(g => g.stato === 'inviata' || g.fase === 'completata')

  const perData = giornateChiuse.reduce((acc, g) => {
    const k = new Date(g.data).toLocaleDateString('it-IT')
    if (!acc[k]) acc[k] = []
    acc[k].push(g)
    return acc
  }, {} as Record<string, typeof giornateChiuse>)

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Giornate lavorative</h1>

      {/* ORDINE 4 — Alert rapportini mancanti lato impresa */}
      {rapportiniMancanti.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="font-semibold text-amber-800">
            ⚠️ {rapportiniMancanti.length} rapportino{rapportiniMancanti.length > 1 ? 'i' : ''} mancante{rapportiniMancanti.length > 1 ? 'i' : ''}
          </p>
          <div className="mt-2 space-y-1">
            {rapportiniMancanti.map(g => (
              <p key={g.id} className="text-sm text-amber-700">
                • {g.operaio.nome} — {g.commessa.nome} ({new Date(g.data).toLocaleDateString('it-IT')})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ORDINE 1 — Monitor countdown giornate in corso (visibile solo impresa) */}
      <GiornateMonitor giornate={giornateAttive} config={cfg} />

      <h2 className="text-base font-semibold text-gray-700 mb-2">📋 Storico giornate</h2>

      {Object.entries(perData).length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna giornata completata ancora.</p>
      )}

      {Object.entries(perData).map(([data, gs]) => (
        <div key={data} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">📅 {data}</h3>
          <div className="bg-white rounded-xl border divide-y">
            {gs.map(g => {
              const { ord, str } = totaleOre(g.ore)
              return (
                <div key={g.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{g.operaio.nome}</p>
                      <p className="text-xs text-gray-500">{g.commessa.nome}</p>
                      {g.rapportino && (
                        <p className="text-xs text-gray-700 mt-1 line-clamp-2">{g.rapportino.lavoroEseguito}</p>
                      )}
                      {!g.rapportino && (
                        <p className="text-xs text-amber-500 mt-1">⚠ Rapportino mancante</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {ord > 0 && <p className="text-xs text-gray-500">{ord}h ord.</p>}
                      {str > 0 && <p className="text-xs text-orange-500">{str}h str.</p>}
                      {g.foto[0] && (
                        <img src={g.foto[0].url} alt="foto" className="w-10 h-10 object-cover rounded mt-1 ml-auto" />
                      )}
                    </div>
                  </div>
                  {g.rapportino?.noteGiornoSuccessivo && (
                    <p className="text-xs text-blue-600 mt-2">📝 Note per domani: {g.rapportino.noteGiornoSuccessivo}</p>
                  )}
                  {g.rapportino?.lavoriExtra && (
                    <p className="text-xs text-purple-600 mt-1">⚡ Extra: {g.rapportino.lavoriExtra}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
