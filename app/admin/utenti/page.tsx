import { requireSuperAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_LABELS: Record<string, { label: string; variant: 'info' | 'success' | 'purple' | 'warning' | 'neutral' | 'danger' }> = {
  impresa:      { label: 'Impresa',       variant: 'info' },
  operaio:      { label: 'Operaio',       variant: 'success' },
  cliente:      { label: 'Cliente',       variant: 'purple' },
  magazziniere: { label: 'Magazziniere',  variant: 'warning' },
  ufficio:      { label: 'Ufficio',       variant: 'neutral' },
  libero:       { label: 'Libero Prof.',  variant: 'warning' },
}

export default async function AdminUtentiPage() {
  await requireSuperAdmin()

  const admin = getAdminClient()
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const users = data?.users || []
  const sorted = [...users].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutti gli utenti"
        badge={<Badge variant="purple">{sorted.length}</Badge>}
      />

      {sorted.length === 0 ? (
        <EmptyState icon="👥" title="Nessun utente" description="Nessun account registrato sulla piattaforma." />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {sorted.map(u => {
              const ruolo = u.user_metadata?.role || 'sconosciuto'
              const info = ROLE_LABELS[ruolo] || { label: ruolo, variant: 'gray' }
              const nome = u.user_metadata?.full_name || ''
              const isBanned = !!u.banned_until

              return (
                <Link
                  key={u.id}
                  href={`/admin/utenti/${u.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-700">
                      {(nome || u.email || '?')[0].toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{nome || '—'}</p>
                      {isBanned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={10} /> Sospeso
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={info.variant}>{info.label}</Badge>
                    <span className="text-[10px] text-gray-400">Iscritto {fmt(u.created_at || null)}</span>
                    <span className="text-[10px] text-gray-400">
                      Ultimo accesso: {fmt(u.last_sign_in_at || null)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
