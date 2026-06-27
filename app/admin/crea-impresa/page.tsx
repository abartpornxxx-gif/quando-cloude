import { requireSuperAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { CreaUtenteForm } from '../CreaUtenteForm'

export default async function CreaImpresaPage() {
  await requireSuperAdmin()
  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        title="Nuova impresa"
        backHref="/admin/dashboard"
        subtitle="Crea un account impresa sulla piattaforma QUADRO."
      />
      <CreaUtenteForm ruolo="impresa" />
    </div>
  )
}

