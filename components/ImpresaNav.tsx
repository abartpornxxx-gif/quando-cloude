'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard', href: '/impresa/dashboard' },
  { label: 'Clienti', href: '/impresa/clienti' },
  { label: 'Preventivi', href: '/impresa/preventivi' },
  { label: 'Commesse', href: '/impresa/commesse' },
  { label: 'Operai', href: '/impresa/operai' },
  { label: 'Materiali', href: '/impresa/materiali' },
  { label: 'Mezzi', href: '/impresa/mezzi' },
  { label: 'Attrezzature', href: '/impresa/attrezzature' },
  { label: 'Fornitori', href: '/impresa/fornitori' },
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
