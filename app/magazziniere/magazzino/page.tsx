import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatData } from '@/lib/format'
import Link from 'next/link'

export default async function MagazzinoPage() {
  await requireMagazziniere()

  const materiali = await prisma.materiale.findMany({
    orderBy: { descrizione: 'asc' },
    include: { movimenti: { orderBy: { data: 'desc' } } },
  })

  const righe = materiali
    .map(m => {
      const giacenza = m.movimenti.reduce((acc, mv) => {
        if (mv.tipo === 'carico' || mv.tipo === 'reso') return acc + mv.quantita
        if (mv.tipo === 'scarico') return acc - mv.quantita
        return acc
      }, 0)
      return { ...m, giacenza }
    })
    .filter(m => m.movimenti.length > 0)

  const ultimi = await prisma.movimentoMagazzino.findMany({
    orderBy: { data: 'desc' },
    take: 30,
    include: {
      materiale: { select: { descrizione: true, unita: true } },
      commessa: { select: { nome: true } },
    },
  })

  const TIPO_LABEL: Record<string, string> = { carico: 'Carico', scarico: 'Scarico', reso: 'Reso' }
  const TIPO_COLOR: Record<string, string> = {
    carico:  'bg-green-100 text-green-700',
    scarico: 'bg-red-100 text-red-700',
    reso:    'bg-yellow-100 text-yellow-700',
  }
  const TIPO_SIGN: Record<string, string> = { carico: '+', scarico: '−', reso: '+' }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Giacenza magazzino</h1>

      {righe.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-400 text-sm">Nessun movimento registrato ancora.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Materiale</th>
                <th className="px-3 py-2 text-right">Giacenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {righe.map(m => (
                <tr key={m.id} className={m.giacenza < 0 ? 'bg-red-50' : ''}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900">{m.descrizione}</p>
                    {m.codice && <p className="text-xs text-gray-400">Cod. {m.codice}</p>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-bold ${m.giacenza < 0 ? 'text-red-600' : m.giacenza === 0 ? 'text-gray-400' : 'text-green-700'}`}>
                      {m.giacenza} {m.unita ?? 'pz'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ultimi.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Ultimi movimenti</p>
          </div>
          <div className="divide-y divide-gray-50">
            {ultimi.map(mv => (
              <div key={mv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {mv.descrizione ?? mv.materiale?.descrizione ?? '—'}
                  </p>
                  {mv.commessa && <p className="text-xs text-gray-400">Commessa: {mv.commessa.nome}</p>}
                  <p className="text-xs text-gray-400">{formatData(mv.data)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_COLOR[mv.tipo]}`}>
                    {TIPO_LABEL[mv.tipo]}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {TIPO_SIGN[mv.tipo]}{mv.quantita} {mv.materiale?.unita ?? 'pz'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/magazziniere/richieste"
        className="block text-center text-blue-600 text-sm py-2"
      >
        ← Vai alle richieste
      </Link>
    </div>
  )
}
