import { requireSuperAdmin } from '@/lib/auth'
import { listaUtenti } from '@/app/admin/actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { UtentiList } from './UtentiList'

export default async function AdminUtentiPage() {
  await requireSuperAdmin()

  const users = await listaUtenti()
  const sorted = [...users].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutti gli utenti"
        badge={<Badge variant="purple">{sorted.length}</Badge>}
      />
      <UtentiList users={sorted} />
    </div>
  )
}
