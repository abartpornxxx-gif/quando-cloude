import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { toggleEvasa } from './actions'
import Link from 'next/link'

export default async function RichiesteDicoPage() {
  await requireImpresa()

  const richieste = await prisma.richiestaDiCo.findMany({
    include: {
      cliente: { select: { nome: true, email: true } },
      commessa: { select: { nome: true, id: true } },
    },
    orderBy: [{ evasa: 'asc' }, { createdAt: 'desc' }],
  })

  const aperte = richieste.filter(r => !r.evasa)
  const evase = richieste.filter(r => r.evasa)

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Richieste DiCo"
        subtitle={`${aperte.length > 0 ? `${aperte.length} da gestire` : 'Tutte evase'} · ${richieste.length} totali`}
        badge={aperte.length > 0 ? <Badge variant="warning">{aperte.length} nuove</Badge> : undefined}
      />

      <div className="space-y-6">
        {richieste.length === 0 && (
          <EmptyState
            title="Nessuna richiesta"
            description="I clienti non hanno ancora richiesto nessuna Dichiarazione di Conformità dal portale."
          />
        )}

        {aperte.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Da gestire ({aperte.length})
            </p>
            <div className="rounded-2xl border border-amber-200 bg-white shadow-card divide-y divide-gray-100 overflow-hidden">
              {aperte.map(r => (
                <RigaRichiesta key={r.id} r={r} />
              ))}
            </div>
          </div>
        )}

        {evase.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 list-none select-none">
              <svg className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 2l4 4-4 4" />
              </svg>
              Già gestite ({evase.length})
            </summary>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-card divide-y divide-gray-100 overflow-hidden opacity-70 mt-3">
              {evase.map(r => (
                <RigaRichiesta key={r.id} r={r} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

type Richiesta = {
  id: string
  evasa: boolean
  createdAt: Date
  note: string | null
  cliente: { nome: string; email: string | null }
  commessa: { nome: string; id: string } | null
}

function RigaRichiesta({ r }: { r: Richiesta }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 select-none">
        {r.cliente.nome.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{r.cliente.nome}</p>
          {r.commessa && (
            <Link
              href={`/impresa/commesse/${r.commessa.id}`}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {r.commessa.nome} →
            </Link>
          )}
        </div>
        {r.note && (
          <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">
            {r.note}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1.5">Ricevuta il {formatData(r.createdAt)}</p>
      </div>
      <div className="shrink-0">
        {r.evasa ? (
          <form action={toggleEvasa.bind(null, r.id)}>
            <button
              type="submit"
              className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-white transition-colors"
            >
              ✓ Evasa
            </button>
          </form>
        ) : (
          <form action={toggleEvasa.bind(null, r.id)}>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              Segna evasa
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
