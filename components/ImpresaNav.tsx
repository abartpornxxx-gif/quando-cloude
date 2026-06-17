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
]

export function ImpresaNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-blue-800 bg-blue-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto py-1 scrollbar-none">
          {NAV.map(item => {
            const isActive =
              item.href === '/impresa/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
