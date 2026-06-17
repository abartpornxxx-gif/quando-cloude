import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaChecklist } from '../actions'

export default async function ModificaChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await prisma.checklistTemplate.findUnique({ where: { id } })
  if (!d) notFound()

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/checklist" className="text-sm text-gray-500 hover:text-gray-700">← Checklist</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 truncate">{d.domanda}</h1>
      </div>

      <form action={salvaChecklist} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={d.id} />

        <div>
          <label className="block text-sm font-medium text-gray-700">Domanda *</label>
          <input name="domanda" required defaultValue={d.domanda}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ordine</label>
            <input name="ordine" type="number" min="0" defaultValue={d.ordine}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Stato</label>
            <select name="attiva" defaultValue={String(d.attiva)}
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
    </div>
  )
}
