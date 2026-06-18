'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/impresa/dashboard' },
  { label: 'Clienti', href: '/impresa/clienti' },
  { label: 'Preventivi', href: '/impresa/preventivi' },
  { label: 'Commesse', href: '/impresa/commesse' },
  { label: 'Fatture', href: '/impresa/fatture' },
  { label: 'F.Passive', href: '/impresa/fatture-passive' },
  { label: 'Scadenzario', href: '/impresa/scadenzario' },
  { label: 'DiCo', href: '/impresa/dico' },
  { label: 'Operai', href: '/impresa/operai' },
  { label: 'Materiali', href: '/impresa/materiali' },
  { label: 'Ordini', href: '/impresa/ordini' },
  { label: 'Magazzino', href: '/impresa/magazzino' },
  { label: 'Mezzi', href: '/impresa/mezzi' },
  { label: 'Attrezzature', href: '/impresa/attrezzature' },
  { label: 'Fornitori', href: '/impresa/fornitori' },
  { label: 'Checklist', href: '/impresa/checklist' },
  { label: 'Calendario', href: '/impresa/calendario' },
  { label: 'Pianificazione', href: '/impresa/pianificazione' },
  { label: 'Assenze', href: '/impresa/assenze' },
  { label: 'Giornate', href: '/impresa/giornate' },
  { label: 'Configurazione', href: '/impresa/configurazione' },
  { label: 'Catalogo', href: '/impresa/catalogo' },
  { label: 'Richieste', href: '/impresa/richieste-offerte' },
]

export function ImpresaNav() {
  const pathname = usePathname()

  return (
    <div className="border-t border-slate-700/60 bg-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto scrollbar-none">
          {NAV.map(item => {
            const isActive =
              item.href === '/impresa/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-slate-700/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
