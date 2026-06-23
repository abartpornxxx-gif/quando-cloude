import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { salvaVarianteLavoro, eliminaVarianteLavoro } from '../../actions'

interface Props {
  params: Promise<{ id: string; variantId: string }>
}

export default async function ModificaVariantePage({ params }: Props) {
  await requireUfficio()
  const { id: commessaId, variantId } = await params

  const commessa = await prisma.commessa.findUnique({
    where: { id: commessaId },
    select: { nome: true },
  })

  if (!commessa) notFound()

  const variant = await prisma.varianteLavoro.findFirst({
    where: { id: variantId, commessaId },
  })

  if (!variant) notFound()

  const salvaVarianteAction = salvaVarianteLavoro.bind(null, commessaId)
  const eliminaVarianteAction = eliminaVarianteLavoro.bind(null, commessaId, variantId)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/ufficio/commesse" className="hover:text-teal-700">Commesse</Link>
        <span>›</span>
        <Link href={`/ufficio/commesse/${commessaId}`} className="hover:text-teal-700">{commessa.nome}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Modifica variante</span>
      </div>

      <div className="flex items-center justify-between">
        <PageHeader title={`Modifica: ${variant.titolo}`} backHref={`/ufficio/commesse/${commessaId}`} />
        
        {/* Form di eliminazione rapida */}
        <form action={eliminaVarianteAction} onSubmit={
          `return confirm('Sei sicuro di voler eliminare questa variante? Questa operazione non può essere annullata.')` as any
        }>
          <button
            type="submit"
            className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 text-xs font-semibold"
          >
            Elimina variante
          </button>
        </form>
      </div>

      <form action={salvaVarianteAction} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        {/* Campo ID nascosto per indicare update */}
        <input type="hidden" name="id" value={variant.id} />

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Titolo variante *</label>
          <input
            name="titolo"
            required
            defaultValue={variant.titolo}
            placeholder="Es. Punti luce aggiuntivi corridoio"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Descrizione</label>
          <textarea
            name="descrizione"
            rows={3}
            defaultValue={variant.descrizione ?? ''}
            placeholder="Dettagli sulle lavorazioni extra richieste..."
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Importo extra (€) *</label>
            <input
              name="importo"
              type="text"
              required
              defaultValue={(variant.importo / 100).toFixed(2)}
              placeholder="Es. 1500.00"
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Ricavo aggiuntivo per il cliente</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Costo stimato (€)</label>
            <input
              name="costoStimato"
              type="text"
              defaultValue={(variant.costoStimato / 100).toFixed(2)}
              placeholder="Es. 500.00"
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Costo previsto per l'impresa</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Stato variante</label>
          <select
            name="stato"
            defaultValue={variant.stato}
            className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none"
          >
            <option value="bozza">Bozza</option>
            <option value="inviata">Inviata al cliente</option>
            <option value="approvata">Approvata</option>
            <option value="rifiutata">Rifiutata</option>
            <option value="annullata">Annullata</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Link documento / verbale</label>
          <input
            name="fileUrl"
            type="text"
            defaultValue={variant.fileUrl ?? ''}
            placeholder="Es. https://... o percorso file"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Note interne</label>
          <textarea
            name="note"
            rows={2}
            defaultValue={variant.note ?? ''}
            placeholder="Note riservate all'ufficio..."
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Salva modifiche
          </button>
          <Link
            href={`/ufficio/commesse/${commessaId}`}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}
