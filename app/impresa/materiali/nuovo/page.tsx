import { salvaMateriale } from '../actions'
import Link from 'next/link'

export default function NuovoMaterialePage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/materiali" className="text-sm text-gray-500 hover:text-gray-700">← Materiali</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuovo articolo</h1>
      </div>
      <MaterialeForm action={salvaMateriale} />
    </div>
  )
}

export function MaterialeForm({ action, dv }: { action: (fd: FormData) => Promise<void>; dv?: Record<string, string> }) {
  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {dv?.id && <input type="hidden" name="id" value={dv.id} />}
      <div>
        <label className="block text-sm font-medium text-gray-700">Codice articolo</label>
        <input name="codice" defaultValue={dv?.codice}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Descrizione *</label>
        <input name="descrizione" required defaultValue={dv?.descrizione}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Prezzo unitario (€) *</label>
          <input name="prezzo" type="number" step="0.01" min="0" required defaultValue={dv?.prezzo ?? '0.00'}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unità di misura</label>
          <input name="unita" defaultValue={dv?.unita ?? 'pz'} placeholder="pz, mt, kg..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Salva</button>
        <Link href="/impresa/materiali" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</Link>
      </div>
    </form>
  )
}
