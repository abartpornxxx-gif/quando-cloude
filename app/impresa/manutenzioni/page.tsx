import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

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
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const diffMs = data.getTime() - oggi.getTime()
  const diffGiorni = Math.floor(diffMs / 86_400_000)
  if (diffGiorni < 0) return 'scaduta'
  if (diffGiorni <= 30) return 'imminente'
  return 'ok'
}

const STATO_BADGE: Record<string, { cls: string; label: string }> = {
  scaduta:   { cls: 'bg-red-100 text-red-700',    label: 'Scaduta' },
  imminente: { cls: 'bg-amber-100 text-amber-700', label: 'In scadenza' },
  ok:        { cls: 'bg-emerald-100 text-emerald-700', label: 'Nei tempi' },
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 px-6 text-center">
          <Wrench size={36} className="text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-700">Nessuna manutenzione programmata</p>
          <p className="mt-1 text-xs text-gray-400 max-w-xs">
            Aggiungi i controlli periodici degli impianti dei tuoi clienti.
          </p>
          <Link
            href="/impresa/manutenzioni/nuovo"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Nuova manutenzione
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
                      {!m.attiva && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                          Sospesa
                        </span>
                      )}
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
                    <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 ${badge.cls}`}>
                      {badge.label}
                    </span>
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
