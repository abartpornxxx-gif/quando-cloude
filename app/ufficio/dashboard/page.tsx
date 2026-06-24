import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { OnboardingGuida } from '@/components/onboarding/OnboardingGuida'
import { FileText, Package, CalendarDays, Receipt, Users, AlertCircle, Building2 } from 'lucide-react'

export default async function UfficioDashboard() {
  const { collaboratore } = await requireUfficio()

  // Solo contatori operativi — NESSUN dato finanziario / margine
  const [
    preventiviDaInviare,
    ordiniAperti,
    fattureDaIncassare,
    fatturePassiveDaPagare,
    clientiTotali,
    commesseAperte,
    commessefiniteRaw,
  ] = await Promise.all([
    prisma.preventivo.count({ where: { stato: 'bozza' } }),
    prisma.ordineFornitore.count({ where: { stato: { in: ['richiesto', 'ordinato'] } } }),
    prisma.fatturaAttiva.count({ where: { stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] } } }),
    prisma.fatturaPassiva.count({ where: { stato: 'da_pagare' } }),
    prisma.cliente.count(),
    // Solo nome/stato — nessun costo o margine selezionato
    prisma.commessa.count({ where: { stato: 'aperta', archiviata: false } }),
    // Commesse finite: contare quelle non saldate
    prisma.commessa.findMany({
      where: { stato: 'finita', archiviata: false },
      select: {
        preventivato: true,
        fatturato: true,
        _count: { select: { fattureAttive: { where: { stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] } } } } },
      },
    }),
  ])

  const pendentiList = commessefiniteRaw.filter(
    c => c._count.fattureAttive > 0 || (c.preventivato > 0 && c.fatturato < c.preventivato)
  )
  const saldiPendenti = pendentiList.length
  const totaleResiduoCents = pendentiList.reduce(
    (acc, c) => acc + Math.max(0, c.preventivato - c.fatturato),
    0
  )
  const totaleResiduoStr =
    totaleResiduoCents > 0
      ? (totaleResiduoCents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
      : null

  const SEZIONI = [
    {
      href: '/ufficio/commesse',
      Icon: Building2,
      label: 'Commesse',
      desc: `${commesseAperte} aperte`,
      alert: false,
      color: 'bg-teal-50 border-teal-200 text-teal-700',
      iconCls: 'text-teal-600',
    },
    {
      href: '/ufficio/preventivi',
      Icon: FileText,
      label: 'Preventivi',
      desc: preventiviDaInviare > 0 ? `${preventiviDaInviare} bozze da inviare` : 'Tutto inviato',
      alert: preventiviDaInviare > 0,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconCls: 'text-blue-600',
    },
    {
      href: '/ufficio/ordini',
      Icon: Package,
      label: 'Ordini materiale',
      desc: ordiniAperti > 0 ? `${ordiniAperti} ordini aperti` : 'Nessun ordine aperto',
      alert: ordiniAperti > 0,
      color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      iconCls: 'text-cyan-600',
    },
    {
      href: '/ufficio/fatture',
      Icon: Receipt,
      label: 'Fatture attive',
      desc: fattureDaIncassare > 0 ? `${fattureDaIncassare} da incassare` : 'Tutto incassato',
      alert: fattureDaIncassare > 0,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      iconCls: 'text-emerald-600',
    },
    {
      href: '/ufficio/fatture-passive',
      Icon: Receipt,
      label: 'Fatture passive',
      desc: fatturePassiveDaPagare > 0 ? `${fatturePassiveDaPagare} da pagare` : 'Tutto pagato',
      alert: fatturePassiveDaPagare > 0,
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      iconCls: 'text-amber-600',
    },
    {
      href: '/ufficio/pianificazione',
      Icon: CalendarDays,
      label: 'Pianificazione',
      desc: `${commesseAperte} cantieri aperti`,
      alert: false,
      color: 'bg-violet-50 border-violet-200 text-violet-700',
      iconCls: 'text-violet-600',
    },
    {
      href: '/ufficio/clienti',
      Icon: Users,
      label: 'Clienti',
      desc: `${clientiTotali} ${clientiTotali === 1 ? 'cliente' : 'clienti'}`,
      alert: false,
      color: 'bg-slate-50 border-slate-200 text-slate-700',
      iconCls: 'text-slate-600',
    },
    {
      href: '/ufficio/saldi-pendenti',
      Icon: AlertCircle,
      label: 'Saldi pendenti',
      desc: saldiPendenti > 0
        ? `${saldiPendenti} ${saldiPendenti === 1 ? 'cantiere' : 'cantieri'} · ${totaleResiduoStr ?? 'residuo'}`
        : 'Tutto saldato',
      alert: saldiPendenti > 0,
      color: saldiPendenti > 0
        ? 'bg-red-50 border-red-200 text-red-700'
        : 'bg-gray-50 border-gray-200 text-gray-700',
      iconCls: saldiPendenti > 0 ? 'text-red-600' : 'text-gray-400',
    },
  ]

  return (
    <div className="space-y-8">
      <OnboardingGuida
        role="ufficio"
        title="💶 Benvenuto nell'Area Amministrativa di QUADRO"
        subtitle="Il tuo assistente per preventivi, fatturazione e flussi finanziari della CreCas Impianti S.r.l."
        features={[
          "Emettere preventivi per nuovi clienti e convertirli direttamente in commesse di cantiere.",
          "Verificare le fatture attive e gestire gli incassi parziali/totali.",
          "Registrare e controllare le fatture passive dei fornitori.",
          "Monitorare in tempo reale lo scadenzario dei debiti/crediti e i saldi pendenti."
        ]}
        actions={[
          "Controlla i Preventivi aperti e le bozze in attesa di essere inviate.",
          "Esamina le Commesse attive e controlla lo stato dei lavori.",
          "Verifica i Saldi Pendenti per avviare il recupero dei crediti.",
          "Registra gli Incassi delle fatture attive e le relative aliquote IVA.",
          "Verifica le scadenze nello Scadenzario per la pianificazione dei pagamenti passivi."
        ]}
        finalMessage="“L'ufficio non deve inseguire le informazioni: QUADRO le raccoglie e le collega al cantiere giusto.”"
        localStorageKey="quadro_onboarding_seen_ufficio"
      />

      {/* Hero */}
      <div className="rounded-2xl mesh-bg-ufficio border border-teal-850 px-6 py-6 shadow-premium-lg">
        <p className="text-teal-200 text-xs font-semibold uppercase tracking-wider">Area Ufficio</p>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Ciao, {collaboratore.nome.split(' ')[0]}!
        </h1>
        <p className="text-teal-100/90 text-sm mt-1.5 font-medium">
          Preventivi, ordini, fatture e pianificazione.
        </p>
      </div>

      {/* Sezioni operative */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Attività</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SEZIONI.map(s => (
            <Link key={s.href} href={s.href}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-premium hover-lift active-press transition-all duration-300 group flex flex-col justify-between min-h-[140px]">
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${s.color.split(' ')[0]} border border-white/10 shadow-sm`}>
                  <s.Icon size={18} className={s.iconCls} />
                </div>
                {s.alert && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 shadow-sm">!</span>
                )}
              </div>
              <div className="mt-4">
                <p className="font-bold text-slate-800 group-hover:text-teal-700 transition-colors leading-tight">{s.label}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Azioni rapide */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Azioni rapide</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/ufficio/preventivi/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4.5 py-2.5 text-sm font-semibold text-white shadow-premium transition-all hover:bg-teal-700 hover-lift active-press">
            + Nuovo preventivo
          </Link>
          <Link href="/ufficio/clienti/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4.5 py-2.5 text-sm font-bold text-slate-700 shadow-premium transition-all hover:bg-gray-50 hover-lift active-press">
            + Nuovo cliente
          </Link>
          <Link href="/ufficio/ordini/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4.5 py-2.5 text-sm font-bold text-slate-700 shadow-premium transition-all hover:bg-gray-50 hover-lift active-press">
            + Nuovo ordine
          </Link>
          <Link href="/ufficio/fatture/nuova"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4.5 py-2.5 text-sm font-bold text-slate-700 shadow-premium transition-all hover:bg-gray-50 hover-lift active-press">
            + Nuova fattura
          </Link>
        </div>
      </div>
    </div>
  )
}
