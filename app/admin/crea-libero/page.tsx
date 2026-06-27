import { requireSuperAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { CreaUtenteForm } from '../CreaUtenteForm'

export default async function CreaLiberoPage() {
  await requireSuperAdmin()
  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        title="Nuovo libero professionista"
        backHref="/admin/dashboard"
        subtitle="Crea un account per un libero professionista (elettricista, idraulico, tecnico ecc.)."
      />
      <CreaUtenteForm ruolo="libero" />
    </div>
  )
}
