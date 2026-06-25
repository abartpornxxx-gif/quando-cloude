import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import ResoForm from './ResoForm'

export default async function ResoPage() {
  await requireImpresa()

  const [materiali, commesse] = await Promise.all([
    prisma.materiale.findMany({ orderBy: { descrizione: 'asc' }, select: { id: true, codice: true, descrizione: true, unita: true } }),
    prisma.commessa.findMany({ where: { stato: 'aperta' }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
  ])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/impresa/magazzino" className="text-sm text-gray-500 hover:text-gray-700">
          ← Magazzino
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Registra reso</h1>
      </div>
      <p className="text-sm text-gray-500">
        Registra il rientro in magazzino di materiale portato in cantiere ma non utilizzato.
      </p>
      <ResoForm materiali={materiali} commesse={commesse} />
    </div>
  )
}
