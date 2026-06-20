import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import NuovaFatturaFormUfficio from './NuovaFatturaFormUfficio'

export default async function NuovaFatturaUfficioPage() {
  await requireUfficio()

  const [clienti, commesse] = await Promise.all([
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.commessa.findMany({ where: { stato: 'aperta' }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
  ])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ufficio/fatture" className="text-teal-600 hover:text-teal-800 text-sm">‹ Fatture</Link>
        <h1 className="text-xl font-bold">Nuova fattura attiva</h1>
      </div>
      <NuovaFatturaFormUfficio clienti={clienti} commesse={commesse} />
    </div>
  )
}
