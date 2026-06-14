import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaCommessa } from '../actions'
import { CommessaForm } from '../CommessaForm'

export default async function CommessaDettPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await prisma.commessa.findUnique({
    where: { id },
    include: {
      cliente: { select: { nome: true } },
      preventivo: { select: { id: true } },
    },
  })
  if (!c) notFound()

  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } })

  const defaultValues = {
    id: c.id, nome: c.nome, clienteId: c.clienteId ?? '', indirizzoCantiere: c.indirizzoCantiere ?? '',
    stato: c.stato, note: c.note ?? '',
    preventivato: c.preventivato, costiMateriali: c.costiMateriali,
    costiManodopera: c.costiManodopera, costiMezzi: c.costiMezzi, fatturato: c.fatturato,
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/impresa/commesse" className="text-sm text-gray-500 hover:text-gray-700">← Commesse</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{c.nome}</h1>
        </div>
        {c.preventivo && (
          <Link href={`/impresa/preventivi/${c.preventivo.id}`}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
            ← Preventivo origine
          </Link>
        )}
      </div>
      <CommessaForm action={salvaCommessa} clienti={clienti} defaultValues={defaultValues} />
    </div>
  )
}
