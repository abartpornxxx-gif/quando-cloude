import { salvaAttrezzatura } from '../actions'
import Link from 'next/link'

export default function NuovaAttrezzaturaPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/attrezzature" className="text-sm text-gray-500 hover:text-gray-700">← Attrezzature</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Nuova attrezzatura</h1>
      </div>
      <AttrezzaturaForm action={salvaAttrezzatura} />
    </div>
  )
}

export function AttrezzaturaForm({ action, dv }: { action: (fd: FormData) => Promise<void>; dv?: Record<string, string> }) {
  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {dv?.id && <input type="hidden" name="id" value={dv.id} />}
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome *</label>
        <input name="nome" required defaultValue={dv?.nome}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Stato</label>
        <select name="stato" defaultValue={dv?.stato ?? 'disponibile'}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="disponibile">Disponibile</option>
          <option value="in_uso">In uso</option>
          <option value="in_manutenzione">In manutenzione</option>
          <option value="fuori_servizio">Fuori servizio</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Assegnatario</label>
        <input name="assegnatario" defaultValue={dv?.assegnatario}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Note</label>
        <textarea name="note" rows={2} defaultValue={dv?.note}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Salva</button>
        <Link href="/impresa/attrezzature" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</Link>
      </div>
    </form>
  )
}
