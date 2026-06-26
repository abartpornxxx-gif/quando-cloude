import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { formatData } from '@/lib/format'
import Link from 'next/link'

export default async function MagazzinoPage() {
  await requireImpresa()

  // Giacenza: tutti i materiali con i loro movimenti
  const materiali = await prisma.materiale.findMany({
    orderBy: { descrizione: 'asc' },
    include: {
      movimenti: {
        orderBy: { data: 'desc' },
      },
    },
  })

  // Calcola giacenza per ciascun materiale
  // carico e reso aumentano, scarico diminuisce
  const righe = materiali
    .map(m => {
      const giacenza = m.movimenti.reduce((acc, mv) => {
        if (mv.tipo === 'carico' || mv.tipo === 'reso') return acc + mv.quantita
        if (mv.tipo === 'scarico') return acc - mv.quantita
        return acc
      }, 0)
      return { ...m, giacenza }
    })
    .filter(m => m.movimenti.length > 0 || m.giacenza !== 0)

  // Ultimi movimenti globali per lo storico
  const ultimi = await prisma.movimentoMagazzino.findMany({
    orderBy: { data: 'desc' },
    take: 50,
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
  const TIPO_SIGN: Record<string, string> = { carico: '+', scarico: 'âˆ’', reso: '+' }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Magazzino</h1>
          <p className="mt-1 text-sm text-gray-500">Giacenza materiali da movimenti registrati</p>
        </div>
        <Link
          href="/impresa/magazzino/reso"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Registra reso
        </Link>
      </div>

      {/* Giacenza */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Giacenza attuale</h2>
          <p className="text-xs text-gray-400">{righe.length} articoli con movimenti</p>
        </div>

        {righe.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nessun movimento registrato. I movimenti vengono creati quando un ordine è segnato come consegnato.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Materiale</th>
                <th className="px-4 py-2 text-right">Carichi</th>
                <th className="px-4 py-2 text-right">Scarichi</th>
                <th className="px-4 py-2 text-right">Resi</th>
                <th className="px-4 py-2 text-right">Giacenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {righe.map(m => {
                const carichi  = m.movimenti.filter(mv => mv.tipo === 'carico').reduce((a, mv) => a + mv.quantita, 0)
                const scarichi = m.movimenti.filter(mv => mv.tipo === 'scarico').reduce((a, mv) => a + mv.quantita, 0)
                const resi     = m.movimenti.filter(mv => mv.tipo === 'reso').reduce((a, mv) => a + mv.quantita, 0)
                return (
                  <tr key={m.id} className={`hover:bg-gray-50 ${m.giacenza < 0 ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.descrizione}</p>
                      {m.codice && <p className="text-xs text-gray-400">Cod. {m.codice}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">+{carichi} {m.unita ?? 'pz'}</td>
                    <td className="px-4 py-3 text-right text-red-600">âˆ’{scarichi} {m.unita ?? 'pz'}</td>
                    <td className="px-4 py-3 text-right text-yellow-700">+{resi} {m.unita ?? 'pz'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${m.giacenza < 0 ? 'text-red-600' : m.giacenza === 0 ? 'text-gray-500' : 'text-green-700'}`}>
                        {m.giacenza} {m.unita ?? 'pz'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Storico movimenti */}
      {ultimi.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Ultimi movimenti</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {ultimi.map(mv => (
              <div key={mv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {mv.descrizione ?? mv.materiale?.descrizione ?? 'â€”'}
                  </p>
                  {mv.commessa && (
                    <p className="text-xs text-gray-400">Commessa: {mv.commessa.nome}</p>
                  )}
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
    </div>
  )
}

