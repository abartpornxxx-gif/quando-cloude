import { requireLibero } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProfiloLiberoForm } from './ProfiloLiberoForm'

export default async function ProfiloLiberoPage() {
  const { libero } = await requireLibero()
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Il mio profilo" subtitle="Dati che appaiono sui tuoi preventivi PDF." />
      <ProfiloLiberoForm libero={{
        id: libero.id,
        nome: libero.nome,
        partitaIva: libero.partitaIva || '',
        indirizzo: libero.indirizzo || '',
        email: libero.email || '',
        telefono: libero.telefono || '',
        note: libero.note || '',
      }} />
    </div>
  )
}
