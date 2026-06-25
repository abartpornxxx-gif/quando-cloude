import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import OrdineFormUfficio from './OrdineFormUfficio'

export default async function NuovoOrdineUfficioPage() {
  await requireUfficio()

  const [fornitori, commesse, materiali] = await Promise.all([
    prisma.fornitore.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
    prisma.commessa.findMany({ where: { stato: 'aperta' }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
    prisma.materiale.findMany({ orderBy: { descrizione: 'asc' }, select: { id: true, codice: true, descrizione: true, prezzo: true, unita: true } }),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ufficio/ordini" className="text-sm text-gray-500 hover:text-gray-700">← Ordini</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Nuovo ordine</h1>
      </div>
      <OrdineFormUfficio fornitori={fornitori} commesse={commesse} materiali={materiali} />
    </div>
  )
}
