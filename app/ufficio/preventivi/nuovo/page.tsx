import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { salvaPreventivoUfficio } from '../actions'
import { PreventivoForm } from '@/app/impresa/preventivi/PreventivoForm'

export default async function NuovoPreventivoUfficioPage() {
  await requireUfficio()
  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/ufficio/preventivi" className="text-sm text-gray-500 hover:text-gray-700">← Preventivi</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuovo preventivo</h1>
      </div>
      <PreventivoForm action={salvaPreventivoUfficio} clienti={clienti} />
    </div>
  )
}
