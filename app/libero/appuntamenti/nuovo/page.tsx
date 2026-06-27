import { requireLibero } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { NuovoAppuntamentoForm } from './NuovoAppuntamentoForm'

export default async function NuovoAppuntamentoPage() {
  await requireLibero()
  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Nuovo appuntamento" backHref="/libero/appuntamenti" />
      <NuovoAppuntamentoForm />
    </div>
  )
}
