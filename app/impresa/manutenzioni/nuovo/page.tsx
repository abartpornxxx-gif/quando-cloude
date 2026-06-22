import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { ManutenzioneForm } from '../ManutenzioneForm'
import { salvaManutenzione } from '../actions'

// Data di default per "prossimo intervento": oggi + 6 mesi
function defaultProssimo(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().slice(0, 10)
}

export default async function NuovaManutenziOnePage() {
  await requireImpresa()

  const clienti = await prisma.cliente.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        backHref="/impresa/manutenzioni"
        backLabel="Manutenzioni"
        title="Nuova manutenzione"
      />
      <ManutenzioneForm
        action={salvaManutenzione}
        clienti={clienti}
        defaultValues={{
          intervalloValore: 6,
          intervalloUnita: 'Mesi',
          tipoImpianto: 'Elettrico',
          dataProssimoIntervento: defaultProssimo(),
          attiva: true,
        }}
      />
    </div>
  )
}
