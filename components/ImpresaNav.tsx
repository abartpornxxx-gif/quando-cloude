'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const MACRO = [
  {
    label: 'Cantieri',
    prefixes: ['/impresa/commesse', '/impresa/preventivi', '/impresa/giornate', '/impresa/pianificazione', '/impresa/calendario', '/impresa/checklist', '/impresa/assenze', '/impresa/tipi-lavoro', '/impresa/rapportini'],
    items: [
      { label: 'Commesse', href: '/impresa/commesse', desc: 'Cantieri aperti' },
      { label: 'Preventivi', href: '/impresa/preventivi', desc: 'Offerte ai clienti' },
      { label: 'Giornate', href: '/impresa/giornate', desc: 'Storico lavori' },
      { label: 'Rapportini', href: '/impresa/rapportini', desc: 'Per commessa' },
      { label: 'Pianificazione', href: '/impresa/pianificazione', desc: 'Turni operai' },
      { label: 'Pianifica domani', href: '/impresa/pianificazione/domani', desc: 'Da rapportini serali' },
      { label: 'Calendario', href: '/impresa/calendario', desc: 'Vista mensile' },
      { label: 'Promemoria', href: '/impresa/checklist', desc: 'Suggerimenti operai' },
      { label: 'Assenze', href: '/impresa/assenze', desc: 'Richieste operai' },
      { label: 'Tipi lavoro', href: '/impresa/tipi-lavoro', desc: 'Checklist adempimenti' },
    ],
  },
  {
    label: 'Persone',
    prefixes: ['/impresa/clienti', '/impresa/operai', '/impresa/fornitori', '/impresa/magazzinieri'],
    items: [
      { label: 'Clienti', href: '/impresa/clienti', desc: 'Anagrafica' },
      { label: 'Operai', href: '/impresa/operai', desc: 'Squadre e ore' },
      { label: 'Magazzinieri', href: '/impresa/magazzinieri', desc: 'Gestione accessi' },
      { label: 'Fornitori', href: '/impresa/fornitori', desc: 'Anagrafica' },
    ],
  },
  {
    label: 'Magazzino',
    prefixes: ['/impresa/materiali', '/impresa/ordini', '/impresa/magazzino', '/impresa/mezzi', '/impresa/attrezzature'],
    items: [
      { label: 'Materiali', href: '/impresa/materiali', desc: 'Listino prezzi' },
      { label: 'Ordini', href: '/impresa/ordini', desc: 'Ordini a fornitori' },
      { label: 'Magazzino', href: '/impresa/magazzino', desc: 'Giacenza attuale' },
      { label: 'Mezzi', href: '/impresa/mezzi', desc: 'Parco veicoli' },
      { label: 'Attrezzature', href: '/impresa/attrezzature', desc: 'Inventario' },
    ],
  },
  {
    label: 'Finanza',
    prefixes: ['/impresa/fatture', '/impresa/fatture-passive', '/impresa/scadenzario', '/impresa/dico'],
    items: [
      { label: 'Fatture', href: '/impresa/fatture', desc: 'Da incassare' },
      { label: 'F. Passive', href: '/impresa/fatture-passive', desc: 'Da pagare' },
      { label: 'Scadenzario', href: '/impresa/scadenzario', desc: 'Tutte le scadenze' },
      { label: 'DiCo', href: '/impresa/dico', desc: 'DM 37/2008' },
    ],
  },
  {
    label: 'Offerte',
    prefixes: ['/impresa/catalogo', '/impresa/richieste-offerte'],
    items: [
      { label: 'Catalogo', href: '/impresa/catalogo', desc: 'Offerte ai clienti' },
      { label: 'Richieste', href: '/impresa/richieste-offerte', desc: 'Interessi ricevuti' },
    ],
  },
  {
    label: 'Impostazioni',
    prefixes: ['/impresa/configurazione'],
    items: [
      { label: 'Configurazione', href: '/impresa/configurazione', desc: 'Orari e opzioni' },
    ],
  },
]

export function ImpresaNav() {
  const pathname = usePathname()
  const isDashboard = pathname === '/impresa/dashboard'
  const [menuAperto, setMenuAperto] = useState(false)

  const chiudiMenu = () => setMenuAperto(false)

  return (
    <div className="border-t border-slate-700/60 bg-slate-800">
      {/* ── Desktop: barra orizzontale con dropdown ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex items-stretch">
          {/* Dashboard link */}
          <Link
            href="/impresa/dashboard"
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isDashboard
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image src="/immagini/icona-dashboard.png" width={13} height={13} alt="" className="brightness-0 invert opacity-70" />
            Dashboard
          </Link>

          {/* Macro-categorie con dropdown */}
          {MACRO.map(macro => {
            const isActive = macro.prefixes.some(p => pathname.startsWith(p))
            return (
              <div key={macro.label} className="group relative flex items-stretch">
                <button
                  className={`flex items-center gap-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {macro.label}
                  <svg className="h-3 w-3 opacity-60 transition-transform group-hover:rotate-180" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 4l4 4 4-4" />
                  </svg>
                </button>

                <div className="absolute top-full left-0 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 pt-1">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[200px]">
                    {macro.items.map(item => {
                      const itemActive = pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                            itemActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs text-gray-400 ml-3">{item.desc}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Mobile: riga con indicatore sezione attiva + hamburger ── */}
        <div className="md:hidden flex items-center justify-between px-0 py-2">
          <span className="text-sm text-slate-300 font-medium truncate">
            {MACRO.find(m => m.prefixes.some(p => pathname.startsWith(p)))?.label ?? 'Dashboard'}
          </span>
          <button
            onClick={() => setMenuAperto(v => !v)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Apri menu"
          >
            {menuAperto ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {menuAperto && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={chiudiMenu}
            aria-hidden="true"
          />

          {/* Pannello */}
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header pannello */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-slate-900 shrink-0">
              <div className="flex items-center gap-2.5">
                <Image src="/immagini/logo-quadro.png" width={24} height={24} alt="" className="rounded-lg" />
                <span className="text-white font-bold text-sm">QUADRO Impresa</span>
              </div>
              <button onClick={chiudiMenu} className="text-slate-400 hover:text-white p-1 rounded transition-colors" aria-label="Chiudi">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto py-3">
              {/* Dashboard */}
              <div className="px-3 mb-2">
                <Link
                  href="/impresa/dashboard"
                  onClick={chiudiMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isDashboard ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Image src="/immagini/icona-dashboard.png" width={18} height={18} alt="" className="opacity-60 shrink-0" />
                  Dashboard
                </Link>
              </div>

              {/* Categorie */}
              {MACRO.map(macro => {
                const macroActive = macro.prefixes.some(p => pathname.startsWith(p))
                return (
                  <div key={macro.label} className="px-3 mb-4">
                    <p className={`text-[11px] font-bold uppercase tracking-wider px-3 mb-1 ${macroActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {macro.label}
                    </p>
                    <div className="space-y-0.5">
                      {macro.items.map(item => {
                        const itemActive = pathname.startsWith(item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={chiudiMenu}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                              itemActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span>{item.label}</span>
                            <span className="text-[11px] text-gray-400 shrink-0 ml-2">{item.desc}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
