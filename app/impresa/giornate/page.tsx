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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Giornate lavorative</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {giornateAttive.length > 0
              ? `${giornateAttive.length} in corso · ${giornateChiuse.length} completate`
              : `${giornateChiuse.length} giornate completate`}
          </p>
        </div>
      </div>

      {/* ORDINE 4 — Alert rapportini mancanti lato impresa */}
      {rapportiniMancanti.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <p className="font-semibold text-amber-800 text-sm">
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

      {/* Storico giornate */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Storico giornate
        </p>

        {Object.entries(perData).length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center">
            <p className="text-sm text-gray-400">Nessuna giornata completata ancora.</p>
          </div>
        )}

        {Object.entries(perData).map(([data, gs]) => (
          <div key={data} className="mb-5">
            <p className="text-xs font-semibold text-gray-500 mb-2">📅 {data}</p>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
              {gs.map(g => {
                const { ord, str } = totaleOre(g.ore)
                return (
                  <div key={g.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{g.operaio.nome}</p>
                          {!g.rapportino && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Rapportino mancante
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{g.commessa.nome}</p>
                        {g.rapportino && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
                            {g.rapportino.lavoroEseguito}
                          </p>
                        )}
                        {g.rapportino?.noteGiornoSuccessivo && (
                          <p className="text-xs text-blue-600 mt-1.5">
                            📝 Domani: {g.rapportino.noteGiornoSuccessivo}
                          </p>
                        )}
                        {g.rapportino?.lavoriExtra && (
                          <p className="text-xs text-violet-600 mt-1">
                            ⚡ Extra: {g.rapportino.lavoriExtra}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-1.5">
                        {ord > 0 && (
                          <p className="text-xs font-medium text-gray-700">{ord}h ord.</p>
                        )}
                        {str > 0 && (
                          <p className="text-xs font-medium text-orange-600">{str}h str.</p>
                        )}
                        {g.foto[0] && (
                          <img
                            src={g.foto[0].url}
                            alt="foto"
                            className="w-12 h-12 object-cover rounded-xl border border-gray-200 mt-1 ml-auto"
                          />
                        )}
                        <a
                          href={`/impresa/giornate/${g.id}/chat`}
                          className="inline-block text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          💬 Chat
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
