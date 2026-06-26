import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { OnboardingGuida } from '@/components/onboarding/OnboardingGuida'
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
      <OnboardingGuida
        role="magazziniere"
        title="📦 Benvenuto nell'Area Magazzino di QUADRO"
        subtitle="Il pannello per gestire materiali, richieste e giacenze per CreCas Impianti S.r.l."
        features={[
          "Monitorare in tempo reale le richieste di materiali degli operai.",
          "Prendere in carico e preparare i pacchetti di materiali per le squadre.",
          "Registrare le consegne e aggiornare l'inventario delle giacenze.",
          "Tracciare i resi non utilizzati riportati dalle squadre a fine giornata."
        ]}
        actions={[
          "Controlla le richieste aperte in sospeso nella dashboard.",
          "Clicca su una richiesta per prenderla in carico per la preparazione.",
          "Prepara i materiali fisici seguendo la lista degli operai.",
          "Segna la richiesta come 'Consegnata' al momento del ritiro.",
          "Controlla periodicamente le giacenze e i resi registrati."
        ]}
        finalMessage="“Il magazzino diventa tracciabile: ogni richiesta resta collegata a operaio, cantiere e materiale.”"
        localStorageKey="quadro_onboarding_seen_magazziniere"
      />
      {/* Hero */}
      <div className="rounded-2xl mesh-bg-magazziniere border border-amber-900 px-6 py-6 shadow-premium-lg">
        <p className="text-amber-100/90 text-xs font-semibold uppercase tracking-wider">Area Magazzino</p>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Ciao, {magazziniere.nome.split(' ')[0]}!
        </h1>
        <p className="text-amber-100/80 text-sm mt-1.5 font-medium">
          Gestione magazzino e richieste cantiere.
        </p>
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
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Richieste in attesa</h2>
          <Link href="/magazziniere/richieste" className="text-xs text-amber-700 font-bold hover:text-amber-800 transition-colors">
            Vedi tutte →
          </Link>
        </div>

        {recenti.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-premium">
            <Image src="/immagini/successo.png" width={80} height={80} alt="" className="mx-auto mb-3 opacity-80" />
            <p className="text-sm font-bold text-gray-700">Tutto evaso</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Nessuna richiesta in attesa</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-premium overflow-hidden divide-y divide-slate-100/60">
            {recenti.map(r => (
              <a key={r.id} href={`/magazziniere/richieste/${r.id}`} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50/50 hover-lift active-press transition-all duration-300">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.urgente && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-700">
                        <Image src="/immagini/icona-urgente.png" width={12} height={12} alt="" className="shrink-0" />
                        {' '}URGENTE
                      </span>
                    )}
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.descrizione}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-medium">
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
