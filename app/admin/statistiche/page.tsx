import { requireSuperAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import { getAdminClient } from '@/lib/supabase/admin'
import { Briefcase, FileText, FileCheck, Users } from 'lucide-react'

function fmtEuro(centesimi: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(centesimi / 100)
}

function fmtData(d: Date) {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATO_BADGE: Record<string, { label: string; variant: 'success' | 'info' | 'neutral' }> = {
  aperta: { label: 'Aperta',  variant: 'success' },
  finita: { label: 'Finita',  variant: 'info' },
  chiusa: { label: 'Chiusa',  variant: 'neutral' },
}

export default async function AdminStatistichePage() {
  await requireSuperAdmin()

  const admin = getAdminClient()
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const users = data?.users || []

  const totaleUtenti = users.length
  const nImprese = users.filter(u => u.user_metadata?.role === 'impresa').length
  const nLiberi  = users.filter(u => u.user_metadata?.role === 'libero').length
  const nOperai  = users.filter(u => u.user_metadata?.role === 'operaio').length
  const nClienti = users.filter(u => u.user_metadata?.role === 'cliente').length

  let commesseTot = 0, commesseAperte = 0, preventivi = 0, giornate = 0
  let fatturatoTot = 0, diceTot = 0
  let commesseRecenti: Array<{
    id: string
    nome: string
    stato: string
    createdAt: Date
    cliente: { nome: string } | null
  }> = []

  try {
    ;[commesseTot, commesseAperte, preventivi, giornate, diceTot] = await Promise.all([
      prisma.commessa.count(),
      prisma.commessa.count({ where: { stato: 'aperta', archiviata: false } }),
      prisma.preventivo.count(),
      prisma.giornata.count(),
      prisma.dichiarazioneConformita.count(),
    ])

    const righe = await prisma.fatturaAttivaRiga.aggregate({ _sum: { prezzoUnitario: true } })
    fatturatoTot = righe._sum?.prezzoUnitario || 0

    commesseRecenti = await prisma.commessa.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { nome: true } } },
    })
  } catch { /* non bloccante */ }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Statistiche piattaforma"
        backHref="/admin/dashboard"
        subtitle="Dati aggregati di tutti i tenant sulla piattaforma."
      />

      {/* Utenti per ruolo */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Utenti</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Totali"       value={totaleUtenti} icon={Users}    variant="purple" />
          <StatCard label="Imprese"      value={nImprese}     icon={Briefcase} variant="info" />
          <StatCard label="Liberi Prof." value={nLiberi}      icon={Users}    variant="warning" />
          <StatCard label="Operai"       value={nOperai}      icon={Users}    variant="success" />
          <StatCard label="Clienti"      value={nClienti}     icon={Users}    variant="info" />
        </div>
      </div>

      {/* Attività piattaforma */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attività piattaforma</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Commesse totali"   value={commesseTot}    icon={Briefcase} variant="info" />
          <StatCard label="Commesse aperte"   value={commesseAperte} icon={Briefcase} variant="success" />
          <StatCard label="Preventivi"        value={preventivi}     icon={FileText}  variant="warning" />
          <StatCard label="Giornate cantiere" value={giornate}       icon={FileText}  variant="info" />
          <StatCard label="DiCo emesse"       value={diceTot}        icon={FileCheck} variant="purple" />
        </div>
      </div>

      {/* Fatturato aggregato */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fatturato aggregato piattaforma</p>
        <p className="text-3xl font-bold text-gray-900">{fmtEuro(fatturatoTot)}</p>
        <p className="text-xs text-gray-500 mt-1">Somma di tutte le fatture attive emesse da tutti i tenant</p>
      </div>

      {/* Attività recente — ultime 5 commesse */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Attività recente</p>
        {commesseRecenti.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna commessa presente.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {commesseRecenti.map(c => {
              const badge = STATO_BADGE[c.stato] ?? { label: c.stato, variant: 'neutral' as const }
              return (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.cliente?.nome ?? '—'} · {fmtData(c.createdAt)}
                    </p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Top imprese — richiede multi-tenancy */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Top imprese per commesse</p>
        <div className="flex items-start gap-3 py-2">
          <div className="mt-0.5 h-5 w-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-violet-600">i</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Disponibile con multi-tenancy</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Questa sezione mostrerà le imprese con più commesse una volta implementato il piano multi-tenancy
              (vedi CLAUDE.md → Multi-tenancy). Attualmente tutte le commesse condividono lo stesso schema.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
