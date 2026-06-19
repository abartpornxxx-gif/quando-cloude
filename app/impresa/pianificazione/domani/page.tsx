import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { ConfermaButton } from './ConfermaButton'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

function urgenzaBadge(u: number | null): { variant: BadgeVariant; label: string } {
  if (!u) return { variant: 'neutral', label: 'Non specificata' }
  if (u >= 5) return { variant: 'danger', label: '🔴 Urgente (5/5)' }
  if (u >= 4) return { variant: 'warning', label: '🟠 Alta (4/5)' }
  if (u >= 3) return { variant: 'info', label: '🟡 Media (3/5)' }
  return { variant: 'success', label: '🟢 Bassa (' + u + '/5)' }
}

export default async function PianificazioneDomaniPage() {
  await requireImpresa()

  const domani = new Date()
  domani.setDate(domani.getDate() + 1)
  domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 1)

  // Rapportini di oggi con campo pianificazione domani
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const fineDiOggi = new Date()
  fineDiOggi.setHours(23, 59, 59, 999)

  const [rapportiniConPiano, pianificazioniDomani, operai, commesse] = await Promise.all([
    // Rapportini di oggi (o degli ultimi 2 giorni) con indicazione per domani
    prisma.rapportino.findMany({
      where: {
        cosaFareDomani: { not: null },
        giornata: {
          data: {
            gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          stato: 'inviata',
        },
      },
      include: {
        giornata: {
          include: {
            operaio: { select: { id: true, nome: true } },
            commessa: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: [
        { urgenzaDomani: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
    // Pianificazioni già create per domani
    prisma.pianificazione.findMany({
      where: { data: { gte: domani, lt: dopodomani }, sostituito: false },
      include: {
        operaio: { select: { id: true, nome: true } },
        commessa: { select: { id: true, nome: true } },
      },
    }),
    prisma.operaio.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.commessa.findMany({
      where: { stato: 'aperta', archiviata: false },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  const domaniStr = domani.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pianificazione domani"
        subtitle={`${domaniStr} · ${rapportiniConPiano.length} suggerimenti dagli operai`}
        backHref="/impresa/pianificazione"
        backLabel="Torna alla settimana"
        action={
          <Link
            href="/impresa/pianificazione"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Tavola settimanale →
          </Link>
        }
      />

      {/* Suggerimenti dagli operai */}
      <section>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Cosa dicono gli operai per domani
        </p>
        {rapportiniConPiano.length === 0 ? (
          <EmptyState
            icon="/immagini/vuoto-documenti.png"
            title="Nessun rapportino con piano per domani"
            description="Quando gli operai compilano la sezione 'domani' nel rapportino serale, le informazioni appaiono qui."
          />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {rapportiniConPiano.map(r => {
              const ub = urgenzaBadge(r.urgenzaDomani)
              const giaAssegnato = pianificazioniDomani.some(
                p => p.operaioId === r.giornata.operaio.id
              )
              return (
                <div key={r.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700">
                        {r.giornata.operaio.nome.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.giornata.operaio.nome}</p>
                        <p className="text-xs text-gray-500">{r.giornata.commessa.nome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={ub.variant}>{ub.label}</Badge>
                      {giaAssegnato && <Badge variant="success">Assegnato ✓</Badge>}
                    </div>
                  </div>

                  <div className="mt-3 bg-emerald-50 rounded-xl p-3">
                    <p className="text-sm text-gray-800 leading-relaxed">{r.cosaFareDomani}</p>
                    {r.stimaOreDomani && (
                      <p className="text-xs text-emerald-700 mt-1.5 font-medium">
                        Stima operaio: {r.stimaOreDomani}h
                      </p>
                    )}
                  </div>

                  {!giaAssegnato && (
                    <div className="mt-3">
                      <ConfermaButton
                        operaioId={r.giornata.operaio.id}
                        operaioNome={r.giornata.operaio.nome}
                        commessaId={r.giornata.commessa.id}
                        commessaNome={r.giornata.commessa.nome}
                        lavoroDaFare={r.cosaFareDomani ?? ''}
                        stimaOreDomani={r.stimaOreDomani}
                        data={domani.toISOString().slice(0, 10)}
                        commesse={commesse}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Pianificazioni già confermate per domani */}
      {pianificazioniDomani.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Giornate confermate per domani ({pianificazioniDomani.length})
          </p>
          <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm divide-y divide-gray-100">
            {pianificazioniDomani.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-4">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-700">
                  {p.operaio.nome.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{p.operaio.nome}</p>
                  <p className="text-xs text-gray-500">{p.commessa.nome}</p>
                  {p.lavoroDaFare && (
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{p.lavoroDaFare}</p>
                  )}
                </div>
                <Badge variant="success">Confermata ✓</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
