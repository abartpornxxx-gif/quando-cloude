'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/impresa/pianificazione', label: 'Pianificazione' },
  { href: '/impresa/pianificazione/board', label: 'Settimana' },
  { href: '/impresa/calendario', label: 'Calendario' },
  { href: '/impresa/giornate', label: 'Centro operativo' },
] as const

function isActive(pathname: string, href: string): boolean {
  if (href === '/impresa/pianificazione') {
    // attivo sulla pagina principale e sulle sub-viste giorno/domani, non sul board
    return (
      pathname === '/impresa/pianificazione' ||
      pathname.startsWith('/impresa/pianificazione/domani') ||
      pathname.startsWith('/impresa/pianificazione/giorno')
    )
  }
  return pathname.startsWith(href)
}

export function PianificazioneSubNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {ITEMS.map(({ href, label }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-700'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
