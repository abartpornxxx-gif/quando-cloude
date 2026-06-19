import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { formatData } from '@/lib/format'

export default async function RapportiniPage() {
  await requireImpresa()

  const commesse = await prisma.commessa.findMany({
    where: { archiviata: false },
    select: {
      id: true,
      nome: true,
      stato: true,
      giornate: {
        where: { rapportino: { isNot: null } },
        select: {
          id: true,
          data: true,
          operaio: { select: { nome: true } },
          ore: { select: { tipo: true, quantita: true } },
          rapportino: {
            select: {
              id: true,
              lavoroEseguito: true,
              oreOrdinarie: true,
              oreStraordinarie: true,
              cosaFareDomani: true,
              urgenzaDomani: true,
            },
          },
        },
        orderBy: { data: 'desc' },
      },
    },
    orderBy: { nome: 'asc' },
  })

  const commesseConRapportini = commesse.filter(c => c.giornate.length > 0)
  const totaleRapportini = commesseConRapportini.reduce((acc, c) => acc + c.giornate.length, 0)

  return (
    <div>
      <PageHeader
        title="Rapportini"
        subtitle={`${totaleRapportini} rapportini in ${commesseConRapportini.length} ${commesseConRapportini.length === 1 ? 'commessa' : 'commesse'}`}
      />

      {commesseConRapportini.length === 0 ? (
        <EmptyState
          icon="/immagini/icona-rapportino.png"
          title="Nessun rapportino"
          description="I rapportini compilati dagli operai a fine giornata appariranno qui, raggruppati per cantiere."
        />
      ) : (
        <div className="space-y-8">
          {commesseConRapportini.map(commessa => (
            <div key={commessa.id}>
              {/* Header commessa */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-gray-900">{commessa.nome}</h2>
                  <Badge variant={commessa.stato === 'aperta' ? 'success' : 'neutral'}>
                    {commessa.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
                  </Badge>
                </div>
                <span className="text-xs text-gray-400">{commessa.giornate.length} rapportini</span>
              </div>

              {/* Lista rapportini */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
                {commessa.giornate.map(g => {
                  const r = g.rapportino!
                  const oreOrd = r.oreOrdinarie
                  const oreStr = r.oreStraordinarie
                  return (
                    <Link
                      key={g.id}
                      href={`/impresa/giornate/${g.id}`}
                      className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors group"
                    >
                      {/* Data */}
                      <div className="shrink-0 text-center w-12">
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                          {new Date(g.data).getDate().toString().padStart(2, '0')}
                        </p>
                        <p className="text-[11px] text-gray-400 uppercase">
                          {new Date(g.data).toLocaleDateString('it-IT', { month: 'short' })}
                        </p>
                      </div>

                      {/* Contenuto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{g.operaio.nome}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">
                            {oreOrd > 0 && `${oreOrd}h ord.`}
                            {oreStr > 0 && ` + ${oreStr}h str.`}
                          </span>
                          {r.urgenzaDomani && r.urgenzaDomani >= 4 && (
                            <Badge variant="danger">Urgente domani</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{r.lavoroEseguito}</p>
                        {r.cosaFareDomani && (
                          <p className="text-xs text-blue-600 mt-0.5 truncate">
                            Domani: {r.cosaFareDomani}
                          </p>
                        )}
                      </div>

                      {/* Freccia */}
                      <span className="shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors text-lg">›</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
