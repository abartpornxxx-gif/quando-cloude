import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { salvaPreventivo } from '../actions'
import { PreventivoForm } from '../PreventivoForm'

export default async function NuovoPreventivoPage() {
  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/preventivi" className="text-sm text-gray-500 hover:text-gray-700">← Preventivi</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Nuovo preventivo</h1>
      </div>
      <PreventivoForm action={salvaPreventivo} clienti={clienti} />
    </div>
  )
}
