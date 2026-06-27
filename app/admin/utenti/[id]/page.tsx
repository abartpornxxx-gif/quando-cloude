import { requireSuperAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { notFound } from 'next/navigation'
import { AdminUtenteActions } from './AdminUtenteActions'
import { Calendar, Clock, Mail, User, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ROLE_LABELS: Record<string, { label: string; variant: 'info' | 'success' | 'purple' | 'warning' | 'neutral' | 'danger' }> = {
  impresa:      { label: 'Impresa',       variant: 'info' },
  operaio:      { label: 'Operaio',       variant: 'success' },
  cliente:      { label: 'Cliente',       variant: 'purple' },
  magazziniere: { label: 'Magazziniere',  variant: 'warning' },
  ufficio:      { label: 'Ufficio',       variant: 'neutral' },
  libero:       { label: 'Libero Prof.',  variant: 'warning' },
}

export default async function AdminUtenteDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params

  const admin = getAdminClient()
  const { data: { user }, error } = await admin.auth.admin.getUserById(id)
  if (error || !user) notFound()

  const ruolo = user.user_metadata?.role || 'sconosciuto'
  const info = ROLE_LABELS[ruolo] || { label: ruolo, variant: 'gray' }
  const nome = user.user_metadata?.full_name || '—'
  const isBanned = !!user.banned_until

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={nome}
        backHref="/admin/utenti"
        badge={<Badge variant={info.variant}>{info.label}</Badge>}
      />

      {isBanned && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm font-medium">
          <AlertTriangle size={16} className="shrink-0" />
          Account sospeso fino al {fmt(user.banned_until)}
        </div>
      )}

      {/* Dati account */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dati account</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Nome completo</p>
              <p className="text-sm font-medium text-gray-900">{nome}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user.email || '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Ruolo</p>
              <Badge variant={info.variant}>{info.label}</Badge>
            </div>
          </div>

          <div className="flex items-start gap-3">
            {user.email_confirmed_at ? (
              <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-xs text-gray-500">Email verificata</p>
              <p className="text-sm font-medium text-gray-900">
                {user.email_confirmed_at ? 'Sì' : 'No — non ancora confermata'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Iscritto il</p>
              <p className="text-sm font-medium text-gray-900">{fmt(user.created_at)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Ultimo accesso</p>
              <p className="text-sm font-medium text-gray-900">{fmt(user.last_sign_in_at)}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">ID utente: <span className="font-mono text-gray-600">{user.id}</span></p>
        </div>
      </div>

      {/* Azioni */}
      <AdminUtenteActions
        userId={user.id}
        isBanned={isBanned}
        email={user.email || ''}
        nome={nome}
      />
    </div>
  )
}
