import { requireSuperAdmin } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { prisma } from '@/lib/prisma'
import { getAdminClient } from '@/lib/supabase/admin'
import { Briefcase, FileText, FileCheck, Users } from 'lucide-react'

function fmtEuro(centesimi: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(centesimi / 100)
}

export default async function AdminStatistichePage() {
  await requireSuperAdmin()

  const admin = getAdminClient()
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  const users = data?.users || []

  const totaleUtenti = users.length
  const nImprese = users.filter(u => u.user_metadata?.role === 'impresa').length
  const nLiberi = users.filter(u => u.user_metadata?.role === 'libero').length
  const nOperai = users.filter(u => u.user_metadata?.role === 'operaio').length
  const nClienti = users.filter(u => u.user_metadata?.role === 'cliente').length

  let commesseTot = 0, commesseAperte = 0, preventivi = 0, giornate = 0
  let fatturatoTot = 0, diceTot = 0

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
  } catch { /* non bloccante */ }

  return (
    <div className="space-y-8">
      <PageHeader title="Statistiche piattaforma" backHref="/admin/dashboard" subtitle="Dati aggregati di tutti i tenant sulla piattaforma." />

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Utenti</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Totali" value={totaleUtenti} icon={Users} variant="purple" />
          <StatCard label="Imprese" value={nImprese} icon={Briefcase} variant="info" />
          <StatCard label="Liberi Prof." value={nLiberi} icon={Users} variant="warning" />
          <StatCard label="Operai" value={nOperai} icon={Users} variant="success" />
          <StatCard label="Clienti" value={nClienti} icon={Users} variant="default" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attività piattaforma</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Commesse totali" value={commesseTot} icon={Briefcase} variant="info" />
          <StatCard label="Commesse aperte" value={commesseAperte} icon={Briefcase} variant="success" />
          <StatCard label="Preventivi" value={preventivi} icon={FileText} variant="warning" />
          <StatCard label="Giornate cantiere" value={giornate} icon={FileText} variant="default" />
          <StatCard label="DiCo emesse" value={diceTot} icon={FileCheck} variant="purple" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fatturato aggregato piattaforma</p>
        <p className="text-3xl font-bold text-gray-900">{fmtEuro(fatturatoTot)}</p>
        <p className="text-xs text-gray-500 mt-1">Somma di tutte le fatture attive emesse da tutti i tenant</p>
      </div>
    </div>
  )
}
