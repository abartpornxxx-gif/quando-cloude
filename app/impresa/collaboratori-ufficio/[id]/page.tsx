import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaCollaboratoreUfficio } from '../actions'
import { verificaAccesso } from '@/app/impresa/accessi/actions'
import { GestioneAccesso } from '@/components/ui/GestioneAccesso'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function CollaboratoreUfficioDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireImpresa()
  const { id } = await params
  const c = await prisma.collaboratoreUfficio.findUnique({ where: { id } })
  if (!c) notFound()

  const hasAccess = c.email ? await verificaAccesso(c.email) : false

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title={c.nome} backHref="/impresa/collaboratori-ufficio" />

      <form action={salvaCollaboratoreUfficio} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <input type="hidden" name="id" value={c.id} />
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Nome e cognome *</label>
          <input name="nome" required defaultValue={c.nome} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
          <input name="email" type="email" defaultValue={c.email ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
          <textarea name="note" rows={2} defaultValue={c.note ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Salva modifiche
          </button>
          <Link href="/impresa/collaboratori-ufficio" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annulla
          </Link>
        </div>
      </form>

      <GestioneAccesso
        email={c.email}
        ruolo="ufficio"
        nome={c.nome}
        hasAccess={hasAccess}
        revalidate={`/impresa/collaboratori-ufficio/${c.id}`}
      />
    </div>
  )
}
