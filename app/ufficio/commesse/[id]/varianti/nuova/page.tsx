import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { salvaVarianteLavoro } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NuovaVariantePage({ params }: Props) {
  await requireUfficio()
  const { id: commessaId } = await params

  const commessa = await prisma.commessa.findUnique({
    where: { id: commessaId },
    select: { nome: true },
  })

  if (!commessa) notFound()

  // Binda l'azione col commessaId
  const salvaVarianteAction = salvaVarianteLavoro.bind(null, commessaId)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/ufficio/commesse" className="hover:text-teal-700">Commesse</Link>
        <span>›</span>
        <Link href={`/ufficio/commesse/${commessaId}`} className="hover:text-teal-700">{commessa.nome}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Nuova variante</span>
      </div>

      <PageHeader title="Nuova Variante Lavoro" backHref={`/ufficio/commesse/${commessaId}`} />

      <form action={salvaVarianteAction} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Titolo variante *</label>
          <input
            name="titolo"
            required
            placeholder="Es. Punti luce aggiuntivi corridoio"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Descrizione</label>
          <textarea
            name="descrizione"
            rows={3}
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
              defaultValue="0.00"
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
              defaultValue="0.00"
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
            className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none"
          >
            <option value="bozza">Bozza</option>
            <option value="inviata">Inviata al cliente</option>
            <option value="approvata">Approvata</option>
            <option value="rifiutata">Rifiutata</option>
            <option value="annullata">Annullata</option>
          </select>
        </div>

        <div className="flex items-center gap-2 py-1">
          <input
            id="visibileCliente"
            name="visibileCliente"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          <label htmlFor="visibileCliente" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
            Visibile al cliente (mostra nel portale cliente)
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Link documento / verbale</label>
          <input
            name="fileUrl"
            type="text"
            placeholder="Es. https://... o percorso file"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Note interne</label>
          <textarea
            name="note"
            rows={2}
            placeholder="Note riservate all'ufficio..."
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Crea variante
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
