import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ciao, {magazziniere.nome.split(' ')[0]}!</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestione magazzino e richieste cantiere</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Da evadere"
          value={aperte}
          sub={aperte > 0 ? 'Richieste in attesa' : 'Nessuna aperta'}
          href="/magazziniere/richieste"
          variant={aperte > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="In preparazione"
          value={inPrep}
          sub={inPrep > 0 ? 'Materiale da consegnare' : 'Nessuna in corso'}
          href="/magazziniere/richieste"
          variant={inPrep > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Lista richieste */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Richieste in attesa</h2>
          <a href="/magazziniere/richieste" className="text-xs text-amber-700 font-medium hover:text-amber-800">
            Vedi tutte →
          </a>
        </div>

        {recenti.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Image src="/immagini/successo.png" width={80} height={80} alt="" className="mx-auto mb-3 opacity-80" />
            <p className="text-sm font-semibold text-gray-700">Tutto evaso</p>
            <p className="text-xs text-gray-400 mt-1">Nessuna richiesta in attesa</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            {recenti.map(r => (
              <a key={r.id} href={`/magazziniere/richieste/${r.id}`} className="flex items-start justify-between gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.urgente && (
                      <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-700">
                        <Image src="/immagini/icona-urgente.png" width={12} height={12} alt="" className="shrink-0" />
                        {' '}URGENTE
                      </span>
                    )}
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.descrizione}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {r.operaio.nome} · {r.commessa.nome}
                  </p>
                </div>
                <Badge variant={r.stato === 'richiesta' ? 'danger' : 'warning'}>
                  {r.stato === 'richiesta' ? 'Da fare' : 'In prep.'}
                </Badge>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
