import { prisma } from '@/lib/prisma'
import { formatEuro } from '@/lib/format'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { ripristinaCommessa } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

export default async function CommesseArchiviateePage() {
  const commesse = await prisma.commessa.findMany({
    where: { archiviata: true },
    orderBy: { updatedAt: 'desc' },
    include: { cliente: { select: { nome: true } } },
  })

  return (
    <div>
      <PageHeader
        title="Commesse archiviate"
        subtitle={`${commesse.length} ${commesse.length === 1 ? 'commessa' : 'commesse'}`}
        backHref="/impresa/commesse"
        backLabel="Tutte le commesse"
      />

      {commesse.length === 0 ? (
        <EmptyState
          icon="/immagini/vuoto-cantieri.png"
          title="Nessuna commessa archiviata"
          description="Le commesse archiviate appaiono qui. Puoi archiviarle dalla lista principale."
          action={
            <Link href="/impresa/commesse" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              Vai alle commesse
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {commesse.map(c => {
            const costi = c.costiMateriali + c.costiManodopera + c.costiMezzi
            const margine = c.preventivato > 0
              ? Math.round(((c.preventivato - costi) / c.preventivato) * 100)
              : null
            return (
              <div key={c.id} className="flex items-stretch rounded-2xl border border-gray-200 bg-white/80 shadow-sm overflow-hidden opacity-80">
                <Link href={`/impresa/commesse/${c.id}`} className="flex-1 min-w-0 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-700">{c.nome}</span>
                        <Badge variant="neutral">Archiviata</Badge>
                        <Badge variant={c.stato === 'aperta' ? 'success' : c.stato === 'finita' ? 'warning' : 'neutral'}>
                          {c.stato === 'aperta' ? 'Aperta' : c.stato === 'finita' ? 'Finita' : 'Chiusa'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">{c.cliente?.nome ?? 'Senza cliente'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-gray-700">{formatEuro(c.preventivato)}</p>
                      {margine !== null && (
                        <p className={`text-xs font-bold mt-0.5 ${margine > 10 ? 'text-emerald-600' : margine > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                          {margine > 0 ? '+' : ''}{margine}% margine
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center px-3 border-l border-gray-100">
                  <DeleteButton
                    action={ripristinaCommessa.bind(null, c.id)}
                    label="Ripristina"
                    variant="warning"
                    confirmMessage={`Ripristinare la commessa "${c.nome}"? Tornerà visibile nella lista principale.`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
