'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const MACRO = [
  {
    label: 'Cantieri',
    prefixes: ['/impresa/commesse', '/impresa/preventivi', '/impresa/giornate', '/impresa/pianificazione', '/impresa/calendario', '/impresa/checklist', '/impresa/assenze', '/impresa/tipi-lavoro'],
    items: [
      { label: 'Commesse', href: '/impresa/commesse', desc: 'Cantieri aperti' },
      { label: 'Preventivi', href: '/impresa/preventivi', desc: 'Offerte ai clienti' },
      { label: 'Giornate', href: '/impresa/giornate', desc: 'Storico lavori' },
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

  return (
    <div className="border-t border-slate-700/60 bg-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-stretch">

          {/* Dashboard link */}
          <Link
            href="/impresa/dashboard"
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
                {/* Trigger */}
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

                {/* Dropdown */}
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
      </div>
    </div>
  )
}
