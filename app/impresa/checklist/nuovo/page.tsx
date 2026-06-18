import { requireImpresa } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { salvaSuggerimento } from '../actions'

export default async function NuovoSuggerimentoPage() {
  await requireImpresa()

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Nuovo promemoria"
        backHref="/impresa/checklist"
        backLabel="Promemoria cantiere"
      />
      <form action={salvaSuggerimento} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Testo del promemoria *</label>
          <input
            name="testo"
            type="text"
            required
            placeholder="es. Pulire il cantiere prima di andare via"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Categoria (opzionale)</label>
          <input
            name="categoria"
            type="text"
            placeholder="es. Sicurezza, Fine giornata, Attrezzatura"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Ordine di visualizzazione</label>
          <input
            name="ordine"
            type="number"
            defaultValue={0}
            min={0}
            className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">0 = primo, numeri più alti = più in basso</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Salva promemoria
          </button>
          <a
            href="/impresa/checklist"
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annulla
          </a>
        </div>
      </form>
    </div>
  )
}
