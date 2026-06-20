import { requireUfficio } from '@/lib/auth'
import Link from 'next/link'
import { salvaOperaioUfficio } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function NuovoOperaioUfficioPage() {
  await requireUfficio()
  return (
    <div className="max-w-xl">
      <PageHeader title="Nuovo operaio" backHref="/ufficio/operai" />
      <form action={salvaOperaioUfficio} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome completo *</label>
            <input name="nome" required className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input name="email" type="email" className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ruolo</label>
            <input name="ruolo" placeholder="es. Elettricista" className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Zona operativa</label>
            <input name="zona" className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
            <textarea name="note" rows={2} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">Salva</button>
          <Link href="/ufficio/operai" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
