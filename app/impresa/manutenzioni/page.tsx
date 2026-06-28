import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const TIPO_LABEL: Record<string, string> = {
  Elettrico:   'Elettrico',
  Allarme:     'Allarme',
  Automazioni: 'Automazioni',
  Altro:       'Altro',
}

function labelRicorrenza(valore: number, unita: string): string {
  const u = unita === 'Mesi'
    ? valore === 1 ? 'mese' : 'mesi'
    : valore === 1 ? 'giorno' : 'giorni'
  return `ogni ${valore} ${u}`
}

function statoScadenza(data: Date): 'scaduta' | 'imminente' | 'ok' {
  const now = new Date()
  const oggiUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dataUtc = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
  const diffGiorni = Math.floor((dataUtc - oggiUtc) / 86_400_000)
  if (diffGiorni < 0) return 'scaduta'
  if (diffGiorni <= 30) return 'imminente'
  return 'ok'
}

const STATO_BADGE: Record<string, { variant: 'danger' | 'warning' | 'success'; label: string }> = {
  scaduta:   { variant: 'danger',  label: 'Scaduta' },
  imminente: { variant: 'warning', label: 'In scadenza' },
  ok:        { variant: 'success', label: 'Nei tempi' },
}

export default async function ManutenzioniPage() {
  await requireImpresa()

  const manutenzioni = await prisma.manutenzioneProgrammata.findMany({
    include: { cliente: { select: { id: true, nome: true } } },
    orderBy: { dataProssimoIntervento: 'asc' },
  })

  return (
    <div>
      <PageHeader
        title="Manutenzioni programmate"
        subtitle={`${manutenzioni.length} ${manutenzioni.length === 1 ? 'manutenzione' : 'manutenzioni'}`}
        action={
          <Link
            href="/impresa/manutenzioni/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuova
          </Link>
        }
      />

      {manutenzioni.length === 0 ? (
        <EmptyState
          title="Nessuna manutenzione programmata"
          description="Aggiungi i controlli periodici degli impianti dei tuoi clienti."
          action={
            <Link
              href="/impresa/manutenzioni/nuovo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Nuova manutenzione
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {manutenzioni.map(m => {
              const stato = statoScadenza(m.dataProssimoIntervento)
              const badge = STATO_BADGE[stato]
              const tipoLabel = m.tipoImpianto === 'Altro' && m.tipoImpiantoAltro
                ? m.tipoImpiantoAltro
                : TIPO_LABEL[m.tipoImpianto] ?? m.tipoImpianto
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors group"
                >
                  {/* Icona */}
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <Wrench size={17} className="text-blue-600" />
                  </div>

                  {/* Contenuto */}
                  <Link href={`/impresa/manutenzioni/${m.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {m.titolo}
                      </p>
                      {!m.attiva && <Badge variant="neutral">Sospesa</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span className="font-medium text-gray-600">{m.cliente.nome}</span>
                      <span>·</span>
                      <span>{tipoLabel}</span>
                      <span>·</span>
                      <span>{labelRicorrenza(m.intervalloValore, m.intervalloUnita)}</span>
                    </div>
                  </Link>

                  {/* Prossimo intervento + badge */}
                  <div className="shrink-0 text-right space-y-1">
                    <p className="text-xs font-semibold text-gray-700">
                      {m.dataProssimoIntervento.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

