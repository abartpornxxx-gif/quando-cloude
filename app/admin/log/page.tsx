import { requireSuperAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { UserPlus, LogIn, ShieldOff } from 'lucide-react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple'

function formatData(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const RUOLO_BADGE: Record<string, BadgeVariant> = {
  impresa: 'info',
  operaio: 'success',
  cliente: 'purple',
  magazziniere: 'warning',
  ufficio: 'neutral',
  libero: 'warning',
}

function ruoloBadge(ruolo: string | undefined) {
  const variant: BadgeVariant = RUOLO_BADGE[ruolo ?? ''] ?? 'neutral'
  return <Badge variant={variant}>{ruolo ?? 'sconosciuto'}</Badge>
}

export default async function LogPage() {
  await requireSuperAdmin()

  const admin = getAdminClient()
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const users = data?.users || []

  const registrazioni = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  const ultimiAccessi = [...users]
    .filter((u) => !!u.last_sign_in_at)
    .sort(
      (a, b) =>
        new Date(b.last_sign_in_at!).getTime() - new Date(a.last_sign_in_at!).getTime(),
    )
    .slice(0, 20)

  const sospesi = users.filter((u) => !!u.banned_until)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Log attività"
        subtitle="Feed delle attività recenti sulla piattaforma"
      />

      {/* Registrazioni recenti */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
            <UserPlus size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Registrazioni recenti</p>
            <p className="text-xs text-gray-400">Ultimi 20 account creati</p>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {registrazioni.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nessun utente registrato</p>
          ) : (
            registrazioni.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">Iscritto il {formatData(u.created_at)}</p>
                </div>
                <div className="shrink-0">{ruoloBadge(u.user_metadata?.role)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ultimi accessi */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
            <LogIn size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Ultimi accessi</p>
            <p className="text-xs text-gray-400">Ultimi 20 login registrati</p>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {ultimiAccessi.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nessun accesso registrato</p>
          ) : (
            ultimiAccessi.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">
                    Ultimo accesso {formatData(u.last_sign_in_at)}
                  </p>
                </div>
                <div className="shrink-0">{ruoloBadge(u.user_metadata?.role)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Account sospesi */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50">
            <ShieldOff size={15} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Account sospesi</p>
            <p className="text-xs text-gray-400">Utenti con accesso bloccato</p>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {sospesi.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nessun account sospeso</p>
          ) : (
            sospesi.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">
                    Sospeso fino al {formatData(u.banned_until)}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {ruoloBadge(u.user_metadata?.role)}
                  <Badge variant="danger">Sospeso</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
