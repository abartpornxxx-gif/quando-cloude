import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import NuovaFatturaForm from './NuovaFatturaForm'

export default async function NuovaFatturaPage() {
  await requireImpresa()

  const [clienti, commesse] = await Promise.all([
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    prisma.commessa.findMany({
      where: { stato: 'aperta' },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="/impresa/fatture" className="text-blue-600 hover:text-blue-800 text-sm">‹ Fatture</a>
        <h1 className="text-xl font-bold">Nuova fattura attiva</h1>
      </div>
      <NuovaFatturaForm clienti={clienti} commesse={commesse} />
    </div>
  )
}
