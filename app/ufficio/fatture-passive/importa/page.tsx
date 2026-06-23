import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ImportatoreClient from './ImportatoreClient'

export default async function UfficioFatturePassiveImportaPage() {
  // Auth guard: only allow Ufficio role
  await requireUfficio()

  // Query commesse and fornitori for matching dropdowns
  const [fornitori, commesse] = await Promise.all([
    prisma.fornitore.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.commessa.findMany({
      where: { archiviata: false },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
  ])

  return (
    <div className="p-4">
      <ImportatoreClient fornitori={fornitori} commesse={commesse} />
    </div>
  )
}
