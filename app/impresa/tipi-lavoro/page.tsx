import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaTipoLavoro } from './actions'

export default async function TipiLavoroPage() {
  await requireImpresa()

  const tipi = await prisma.tipoLavoro.findMany({
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    include: {
      _count: { select: { modelli: true, commesse: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="Tipi di lavoro"
        subtitle="Modelli di checklist adempimenti per tipo di cantiere"
        action={
          <Link
            href="/impresa/tipi-lavoro/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Nuovo tipo
          </Link>
        }
      />

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <strong>Avviso:</strong> Gli adempimenti obbligatori per la sicurezza vanno verificati con il proprio RSPP/consulente
        (riferimento D.Lgs. 81/2008). Le voci inserite qui non costituiscono consulenza legale.
      </div>

      {tipi.length === 0 ? (
        <EmptyState
          icon="/immagini/vuoto-documenti.png"
          title="Nessun tipo di lavoro"
          description="Crea il primo tipo di lavoro per definire le checklist di adempimenti da applicare alle commesse."
          action={
            <Link href="/impresa/tipi-lavoro/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              + Nuovo tipo
            </Link>
          }
        />
      ) : (
        <div className="mt-4 space-y-3">
          {tipi.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <Link href={`/impresa/tipi-lavoro/${t.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {t.nome}
                  </Link>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    {t._count.modelli} voc{t._count.modelli === 1 ? 'e' : 'i'}
                  </span>
                  {t._count.commesse > 0 && (
                    <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                      {t._count.commesse} commess{t._count.commesse === 1 ? 'a' : 'e'}
                    </span>
                  )}
                </div>
                {t.descrizione && (
                  <p className="mt-0.5 text-sm text-gray-500 truncate">{t.descrizione}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link
                  href={`/impresa/tipi-lavoro/${t.id}`}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 shadow-sm"
                >
                  Gestisci voci
                </Link>
                <DeleteButton
                  action={eliminaTipoLavoro.bind(null, t.id)}
                  label="Elimina"
                  confirmMessage={`Eliminare il tipo di lavoro "${t.nome}"? Verranno eliminati anche tutti i modelli di adempimento associati.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
