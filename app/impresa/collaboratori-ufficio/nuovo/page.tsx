import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import { salvaCollaboratoreUfficio } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function NuovoCollaboratoreUfficioPage() {
  await requireImpresa()

  return (
    <div className="max-w-xl">
      <PageHeader title="Nuovo collaboratore ufficio" backHref="/impresa/collaboratori-ufficio" />

      <form action={salvaCollaboratoreUfficio} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nome e cognome *</label>
          <input name="nome" required className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email (per accesso app)</label>
          <input name="email" type="email" className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
          <p className="mt-1 text-xs text-gray-400">Dopo aver salvato, usa il pulsante "Crea accesso" per impostare la password.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
          <textarea name="note" rows={2} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Salva
          </button>
          <Link href="/impresa/collaboratori-ufficio" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}
