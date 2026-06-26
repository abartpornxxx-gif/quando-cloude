import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

export default async function RichiestePage() {
  await requireMagazziniere()

  const richieste = await prisma.richiestaMateriale.findMany({
    include: {
      operaio: { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
    orderBy: [{ stato: 'asc' }, { urgente: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })

  const aperte = richieste.filter(r => r.stato === 'richiesta').length
  const inPrep = richieste.filter(r => r.stato === 'in_preparazione').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Richieste materiale"
        subtitle={`${aperte} da evadere · ${inPrep} in preparazione`}
      />

      {richieste.length === 0 ? (
        <EmptyState
          icon="/immagini/successo.png"
          title="Tutto evaso"
          description="Nessuna richiesta in attesa al momento."
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-premium overflow-hidden divide-y divide-gray-100">
          {richieste.map(r => (
            <Link
              key={r.id}
              href={`/magazziniere/richieste/${r.id}`}
              className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-gray-50/60 hover-lift active-press transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.urgente && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-700">
                      <Image src="/immagini/icona-urgente.png" width={12} height={12} alt="" className="shrink-0" />
                      URGENTE
                    </span>
                  )}
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.descrizione}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-medium">
                  {r.operaio.nome} · {r.commessa.nome}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(r.createdAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="shrink-0 pt-0.5">
                {r.stato === 'richiesta' && <Badge variant="danger">Da fare</Badge>}
                {r.stato === 'in_preparazione' && <Badge variant="warning">In prep.</Badge>}
                {r.stato === 'consegnata' && <Badge variant="success">Consegnata</Badge>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
