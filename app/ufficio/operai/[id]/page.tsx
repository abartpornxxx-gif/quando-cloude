import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaOperaioUfficio } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function OperaioUfficioDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUfficio()
  const { id } = await params
  const o = await prisma.operaio.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, ruolo: true, zona: true, note: true },
  })
  if (!o) notFound()

  return (
    <div className="max-w-xl">
      <PageHeader title={o.nome} backHref="/ufficio/operai" />
      <form action={salvaOperaioUfficio} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <input type="hidden" name="id" value={o.id} />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome completo *</label>
            <input name="nome" required defaultValue={o.nome} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input name="email" type="email" defaultValue={o.email ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ruolo</label>
            <input name="ruolo" defaultValue={o.ruolo ?? ''} placeholder="es. Elettricista" className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Zona operativa</label>
            <input name="zona" defaultValue={o.zona ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
            <textarea name="note" rows={2} defaultValue={o.note ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">Salva modifiche</button>
          <Link href="/ufficio/operai" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
