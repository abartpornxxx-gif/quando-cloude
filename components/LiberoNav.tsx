'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wrench, Users, FileText, Calendar, Settings, type LucideIcon } from 'lucide-react'

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/libero/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/libero/interventi', label: 'Interventi', icon: Wrench },
  { href: '/libero/clienti', label: 'Clienti', icon: Users },
  { href: '/libero/preventivi', label: 'Preventivi', icon: FileText },
  { href: '/libero/appuntamenti', label: 'Appuntamenti', icon: Calendar },
  { href: '/libero/profilo', label: 'Profilo', icon: Settings },
]

export function LiberoNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/libero/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-orange-900 text-white'
                : 'text-orange-200 hover:bg-orange-700 hover:text-white'
            }`}
          >
            <Icon size={13} className={isActive ? 'opacity-100' : 'opacity-80'} />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
