import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function GiornateImpresaPage() {
  await requireImpresa()

  const giornate = await prisma.giornata.findMany({
    include: {
      operaio: { select: { nome: true } },
      commessa: { select: { nome: true } },
      rapportino: true,
      ore: true,
      foto: { select: { url: true }, take: 1 },
    },
    orderBy: { data: 'desc' },
    take: 100,
  })

  function totaleOre(ore: { quantita: number; tipo: string }[]) {
    const ord = ore.filter(o => o.tipo === 'ordinaria').reduce((s, o) => s + o.quantita, 0)
    const str = ore.filter(o => o.tipo === 'straordinaria').reduce((s, o) => s + o.quantita, 0)
    return { ord, str }
  }

  const perData = giornate.reduce((acc, g) => {
    const k = new Date(g.data).toLocaleDateString('it-IT')
    if (!acc[k]) acc[k] = []
    acc[k].push(g)
    return acc
  }, {} as Record<string, typeof giornate>)

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Giornate lavorative</h1>

      {Object.entries(perData).length === 0 && (
        <p className="text-gray-400">Nessuna giornata registrata</p>
      )}

      {Object.entries(perData).map(([data, gs]) => (
        <div key={data} className="mb-6">
          <h2 className="text-base font-semibold text-gray-600 mb-2">📅 {data}</h2>
          <div className="bg-white rounded-xl border divide-y">
            {gs.map(g => {
              const { ord, str } = totaleOre(g.ore)
              const haRapportino = !!g.rapportino
              return (
                <div key={g.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{g.operaio.nome}</p>
                      <p className="text-xs text-gray-500">{g.commessa.nome}</p>
                      {g.rapportino && (
                        <p className="text-xs text-gray-700 mt-1 line-clamp-2">{g.rapportino.lavoroEseguito}</p>
                      )}
                      {!haRapportino && (
                        <p className="text-xs text-amber-500 mt-1">
                          {g.fase === 'completata' ? '⚠ Rapportino mancante' : `In corso: ${g.fase}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{ord}h ord.</p>
                      {str > 0 && <p className="text-xs text-orange-500">{str}h str.</p>}
                      {g.foto[0] && (
                        <img src={g.foto[0].url} alt="foto" className="w-10 h-10 object-cover rounded mt-1 ml-auto" />
                      )}
                    </div>
                  </div>
                  {g.rapportino?.noteGiornoSuccessivo && (
                    <p className="text-xs text-blue-600 mt-2">📝 Note per domani: {g.rapportino.noteGiornoSuccessivo}</p>
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
