import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import NuovaFatturaPassivaFormUfficio from './NuovaFatturaPassivaFormUfficio'

export default async function NuovaFatturaPassivaUfficioPage() {
  await requireUfficio()

  const [fornitori, commesse, ordini] = await Promise.all([
    prisma.fornitore.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.commessa.findMany({ where: { stato: { in: ['aperta', 'finita'] } }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.ordineFornitore.findMany({
      include: { fornitore: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ufficio/fatture-passive" className="text-teal-600 hover:text-teal-800 text-sm">‹ Fatture passive</Link>
        <h1 className="text-2xl font-bold text-gray-900">Registra fattura fornitore</h1>
      </div>
      <NuovaFatturaPassivaFormUfficio fornitori={fornitori} commesse={commesse} ordini={ordini} />
    </div>
  )
}
