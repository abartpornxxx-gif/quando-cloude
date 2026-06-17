import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaChecklist } from './actions'

export default async function ChecklistPage() {
  const domande = await prisma.checklistTemplate.findMany({ orderBy: { ordine: 'asc' } })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist cantiere</h1>
          <p className="mt-1 text-sm text-gray-500">
            Domande sì/no che l&apos;operaio compila ogni giornata
          </p>
        </div>
        <Link href="/impresa/checklist/nuova"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Nuova domanda
        </Link>
      </div>

      {domande.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessuna domanda. Aggiungine una per attivare la checklist nelle giornate.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {domande.map((d, i) => (
            <div key={d.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.domanda}</p>
                  {!d.attiva && (
                    <span className="text-xs text-orange-500">Disattivata</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/impresa/checklist/${d.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Modifica
                </Link>
                <DeleteButton action={eliminaChecklist.bind(null, d.id)} label="Elimina" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
