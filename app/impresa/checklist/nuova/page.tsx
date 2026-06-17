import Link from 'next/link'
import { salvaChecklist } from '../actions'

export default function NuovaChecklistPage() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/checklist" className="text-sm text-gray-500 hover:text-gray-700">← Checklist</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuova domanda</h1>
      </div>
      <ChecklistForm action={salvaChecklist} />
    </div>
  )
}

function ChecklistForm({ action, defaultValues }: {
  action: (fd: FormData) => Promise<void>
  defaultValues?: { id?: string; domanda?: string; ordine?: number; attiva?: boolean }
}) {
  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div>
        <label className="block text-sm font-medium text-gray-700">Domanda *</label>
        <input name="domanda" required defaultValue={defaultValues?.domanda}
          placeholder="Es. Hai verificato la continuità dei conduttori di protezione?"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <p className="mt-1 text-xs text-gray-400">Formulare come domanda con risposta Sì / No</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Ordine</label>
          <input name="ordine" type="number" min="0" defaultValue={defaultValues?.ordine ?? 0}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stato</label>
          <select name="attiva" defaultValue={String(defaultValues?.attiva ?? true)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="true">Attiva</option>
            <option value="false">Disattivata</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Salva
        </button>
        <Link href="/impresa/checklist"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </Link>
      </div>
    </form>
  )
}
