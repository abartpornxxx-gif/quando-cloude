import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { DeleteButton } from '@/components/DeleteButton'
import { salvaTipoLavoro, salvaVoceModello, eliminaVoceModello } from '../actions'

export default async function EditTipoLavoroPage({ params }: { params: Promise<{ id: string }> }) {
  await requireImpresa()
  const { id } = await params

  const tipo = await prisma.tipoLavoro.findUnique({
    where: { id },
    include: { modelli: { orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }] } },
  })
  if (!tipo) notFound()

  async function aggiungiVoce(fd: FormData) {
    'use server'
    await salvaVoceModello(id, fd)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        backHref="/impresa/tipi-lavoro"
        backLabel="Tipi lavoro"
        title={`Tipo: ${tipo.nome}`}
        subtitle={tipo.descrizione ?? undefined}
      />

      {/* Modifica nome/descrizione */}
      <form action={salvaTipoLavoro} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <input type="hidden" name="id" value={tipo.id} />
        <h2 className="text-sm font-semibold text-gray-700">Dati del tipo di lavoro</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome *</label>
            <input name="nome" required defaultValue={tipo.nome}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ordine</label>
            <input name="ordine" type="number" defaultValue={tipo.ordine}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descrizione</label>
          <textarea name="descrizione" rows={2} defaultValue={tipo.descrizione ?? ''}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
          Salva modifiche
        </button>
      </form>

      {/* Voci adempimenti modello */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            Voci adempimento ({tipo.modelli.length})
          </h2>
          <p className="text-xs text-gray-400">Queste voci saranno applicate alle commesse</p>
        </div>

        {tipo.modelli.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            Nessuna voce ancora. Aggiungi la prima qui sotto.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tipo.modelli.map((m, i) => (
              <div key={m.id} className="flex items-start gap-4 px-5 py-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.testo}</p>
                  {m.note && <p className="text-xs text-gray-400 mt-0.5">{m.note}</p>}
                  {m.collegamento && (
                    <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                      Collegato: {m.collegamento}
                    </span>
                  )}
                </div>
                <DeleteButton
                  action={eliminaVoceModello.bind(null, m.id, tipo.id)}
                  label="Rimuovi"
                  confirmMessage={`Rimuovere la voce "${m.testo}"?`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Aggiungi voce */}
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aggiungi voce</p>
          <form action={aggiungiVoce} className="space-y-3">
            <div>
              <input name="testo" required placeholder="Descrizione dell&apos;adempimento *"
                className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input name="note" placeholder="Note opzionali"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <select name="collegamento"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">— Collegamento (opzionale) —</option>
                <option value="dico">Dichiarazione di Conformità (DiCo)</option>
                <option value="foto">Richiede foto</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input name="ordine" type="number" placeholder="Ordine" defaultValue={tipo.modelli.length + 1}
                className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
                + Aggiungi voce
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <strong>Avviso:</strong> Le voci di adempimento sono personalizzabili. Gli obblighi di sicurezza
        reali vanno verificati con il proprio RSPP/consulente (D.Lgs. 81/2008). Queste voci non
        costituiscono consulenza legale o normativa.
      </div>
    </div>
  )
}
