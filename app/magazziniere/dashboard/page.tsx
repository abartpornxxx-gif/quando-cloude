import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function MagazziniereDashboard() {
  const { magazziniere } = await requireMagazziniere()

  const [aperte, inPrep] = await Promise.all([
    prisma.richiestaMateriale.count({ where: { stato: 'richiesta' } }),
    prisma.richiestaMateriale.count({ where: { stato: 'in_preparazione' } }),
  ])

  const recenti = await prisma.richiestaMateriale.findMany({
    where: { stato: { in: ['richiesta', 'in_preparazione'] } },
    include: {
      operaio: { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
    orderBy: [{ urgente: 'desc' }, { createdAt: 'asc' }],
    take: 10,
  })

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Ciao, {magazziniere.nome}</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{aperte}</p>
          <p className="text-sm text-red-700">Richieste aperte</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{inPrep}</p>
          <p className="text-sm text-yellow-700">In preparazione</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {recenti.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm">Nessuna richiesta in attesa</p>
        ) : recenti.map(r => (
          <a key={r.id} href={`/magazziniere/richieste/${r.id}`} className="block p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {r.urgente && <span className="text-xs text-red-600 font-semibold">🚨 URGENTE — </span>}
                <span className="text-sm font-medium">{r.descrizione}</span>
                <p className="text-xs text-gray-500 mt-0.5">{r.operaio.nome} · {r.commessa.nome}</p>
              </div>
              <span className={[
                'text-xs px-2 py-1 rounded-full shrink-0',
                r.stato === 'richiesta' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700',
              ].join(' ')}>
                {r.stato === 'richiesta' ? 'Da fare' : 'In prep.'}
              </span>
            </div>
          </a>
        ))}
      </div>

      <a href="/magazziniere/richieste" className="block text-center text-blue-600 text-sm py-2">
        Vedi tutte le richieste →
      </a>
    </div>
  )
}
