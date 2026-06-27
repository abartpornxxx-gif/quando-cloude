import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { NuovoPreventivoLiberoForm } from './NuovoPreventivoLiberoForm'

export default async function NuovoPreventivoLiberoPage() {
  await requireLibero()

  const clienti = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Nuovo preventivo" backHref="/libero/preventivi" />
      <NuovoPreventivoLiberoForm clienti={clienti} />
    </div>
  )
}
