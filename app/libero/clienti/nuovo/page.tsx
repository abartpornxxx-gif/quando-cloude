import { requireLibero } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { NuovoClienteLiberoForm } from './NuovoClienteLiberoForm'

export default async function NuovoClienteLiberoPage() {
  await requireLibero()
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Nuovo cliente" backHref="/libero/clienti" />
      <NuovoClienteLiberoForm />
    </div>
  )
}
