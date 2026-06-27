import { requireSuperAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { ComunicazioniForm } from './ComunicazioniForm'

export default async function ComunicazioniPage() {
  await requireSuperAdmin()

  const admin = getAdminClient()
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const users = data?.users || []

  const conteggioPerRuolo: Record<string, number> = {}
  for (const u of users) {
    const ruolo = (u.user_metadata?.role as string) || 'sconosciuto'
    conteggioPerRuolo[ruolo] = (conteggioPerRuolo[ruolo] ?? 0) + 1
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Comunicazioni"
        subtitle="Invia messaggi agli utenti della piattaforma"
      />
      <ComunicazioniForm conteggioPerRuolo={conteggioPerRuolo} />
    </div>
  )
}
