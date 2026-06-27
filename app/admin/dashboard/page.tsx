import { requireSuperAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Users, Building2, Briefcase, ShoppingBag, Clock, UserCheck, AlertTriangle } from 'lucide-react'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_INFO: Record<string, { label: string; variant: 'info' | 'success' | 'purple' | 'warning' | 'neutral' | 'danger' }> = {
  impresa:      { label: 'Impresa',       variant: 'info' },
  operaio:      { label: 'Operaio',       variant: 'success' },
  cliente:      { label: 'Cliente',       variant: 'purple' },
  magazziniere: { label: 'Magazziniere',  variant: 'warning' },
  ufficio:      { label: 'Ufficio',       variant: 'neutral' },
  libero:       { label: 'Libero Prof.',  variant: 'warning' },
  sconosciuto:  { label: 'N/D',           variant: 'neutral' },
}

export default async function AdminDashboardPage() {
  await requireSuperAdmin()

  const admin = getAdminClient()
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const users = data?.users || []

  const now = Date.now()
  const settGiorni = 7 * 24 * 60 * 60 * 1000

  const totale = users.length
  const attivi7gg = users.filter(u => u.last_sign_in_at && (now - new Date(u.last_sign_in_at).getTime()) < settGiorni).length
  const sospesi = users.filter(u => !!u.banned_until).length
  const nonConfermati = users.filter(u => !u.email_confirmed_at).length

  const perRuolo = users.reduce<Record<string, number>>((acc, u) => {
    const r = u.user_metadata?.role || 'sconosciuto'
    acc[r] = (acc[r] || 0) + 1
    return acc
  }, {})

  const recenti = [...users]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 10)

  let commesseTotali = 0
  let commesseAperte = 0
  try {
    ;[commesseTotali, commesseAperte] = await Promise.all([
      prisma.commessa.count(),
      prisma.commessa.count({ where: { stato: 'aperta', archiviata: false } }),
    ])
  } catch { /* non bloccante */ }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard piattaforma</h1>
        <p className="text-sm text-gray-500 mt-1">Panoramica globale di tutti i tenant QUADRO</p>
      </div>

      {/* KPI utenti */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Utenti totali" value={totale} icon={Users} variant="purple" />
        <StatCard label="Attivi 7 giorni" value={attivi7gg} icon={UserCheck} variant="success" />
        <StatCard label="Account sospesi" value={sospesi} icon={AlertTriangle} variant="danger" />
        <StatCard label="Email non conf." value={nonConfermati} icon={Clock} variant="warning" />
      </div>

      {/* KPI piattaforma */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Commesse totali" value={commesseTotali} icon={Briefcase} variant="info" />
        <StatCard label="Commesse aperte" value={commesseAperte} icon={ShoppingBag} variant="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuzione per ruolo */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Utenti per ruolo</h2>
          <div className="space-y-3">
            {Object.entries(perRuolo).sort((a, b) => b[1] - a[1]).map(([ruolo, count]) => {
              const info = ROLE_INFO[ruolo] || { label: ruolo, variant: 'default' }
              const pct = totale > 0 ? Math.round((count / totale) * 100) : 0
              return (
                <div key={ruolo} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <Building2 size={14} className="text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 font-medium">{info.label}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Utenti recenti */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Ultimi 10 iscritti</h2>
          <div className="divide-y divide-gray-100">
            {recenti.map(u => {
              const ruolo = u.user_metadata?.role || 'sconosciuto'
              const info = ROLE_INFO[ruolo] || { label: ruolo, variant: 'default' }
              return (
                <div key={u.id} className="flex items-center gap-3 py-2.5">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-purple-700">
                      {(u.user_metadata?.full_name || u.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {u.user_metadata?.full_name || u.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={info.variant}>{info.label}</Badge>
                    <span className="text-[10px] text-gray-400">{fmt(u.created_at || null)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
