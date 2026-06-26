'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Inbox, Warehouse, type LucideIcon } from 'lucide-react'

const NAV_ITEMS: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: 'Dashboard', href: '/magazziniere/dashboard', Icon: LayoutDashboard },
  { label: 'Richieste', href: '/magazziniere/richieste', Icon: Inbox },
  { label: 'Giacenza', href: '/magazziniere/magazzino', Icon: Warehouse },
]

export function MagazzinoNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1">
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-amber-700 text-white'
                : 'text-amber-100 hover:bg-amber-700 hover:text-white'
            }`}
          >
            <item.Icon size={14} className={isActive ? 'opacity-100' : 'opacity-80'} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
