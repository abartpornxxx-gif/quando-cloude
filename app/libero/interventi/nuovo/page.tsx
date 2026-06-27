import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { NuovoInterventoForm } from './NuovoInterventoForm'

export default async function NuovoInterventoPage() {
  const { libero } = await requireLibero()

  const clienti = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Nuovo intervento" backHref="/libero/interventi" />
      <NuovoInterventoForm liberoId={libero.id} clienti={clienti} />
    </div>
  )
}
