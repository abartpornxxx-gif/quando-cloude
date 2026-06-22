import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FileText, Package, CalendarDays, Receipt, Users, AlertCircle } from 'lucide-react'

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
    prisma.fatturaAttiva.count({ where: { stato: { in: ['da_incassare', 'scaduta'] } } }),
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
        _count: { select: { fattureAttive: { where: { stato: { in: ['da_incassare', 'scaduta'] } } } } },
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
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-700 to-teal-600 border border-teal-600 px-6 py-5 shadow-md">
        <p className="text-teal-200 text-xs font-medium">Area Ufficio</p>
        <h1 className="text-xl font-bold text-white mt-0.5">
          Ciao, {collaboratore.nome.split(' ')[0]}!
        </h1>
        <p className="text-teal-200 text-sm mt-1">
          Preventivi, ordini, fatture e pianificazione.
        </p>
      </div>

      {/* Sezioni operative */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attività</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SEZIONI.map(s => (
            <Link key={s.href} href={s.href}
              className={`rounded-2xl border ${s.color} p-5 hover:shadow-md transition-all group`}>
              <div className="flex items-start justify-between">
                <s.Icon size={22} className={s.iconCls} />
                {s.alert && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">!</span>
                )}
              </div>
              <p className="mt-3 font-semibold text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Azioni rapide */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Azioni rapide</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/ufficio/preventivi/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors">
            + Nuovo preventivo
          </Link>
          <Link href="/ufficio/clienti/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            + Nuovo cliente
          </Link>
          <Link href="/ufficio/ordini/nuovo"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            + Nuovo ordine
          </Link>
          <Link href="/ufficio/fatture/nuova"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            + Nuova fattura
          </Link>
        </div>
      </div>
    </div>
  )
}
