import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { salvaTipoLavoro } from '../actions'

export default async function NuovoTipoLavoroPage() {
  await requireImpresa()

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        backHref="/impresa/tipi-lavoro"
        backLabel="Tipi lavoro"
        title="Nuovo tipo di lavoro"
      />

      <form action={salvaTipoLavoro} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome *</label>
          <input name="nome" required placeholder="es. Civile, Industriale, Fotovoltaico"
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descrizione</label>
          <textarea name="descrizione" rows={2} placeholder="Breve descrizione del tipo di lavoro"
            className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ordine di visualizzazione</label>
          <input name="ordine" type="number" defaultValue="0"
            className="mt-1 block w-32 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
            Crea tipo
          </button>
          <Link href="/impresa/tipi-lavoro" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}
