'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Users, BarChart3, PlusCircle, LayoutDashboard, Mail, Activity, type LucideIcon } from 'lucide-react'

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/utenti', label: 'Utenti', icon: Users },
  { href: '/admin/crea-impresa', label: 'Nuova impresa', icon: PlusCircle },
  { href: '/admin/crea-libero', label: 'Nuovo libero', icon: PlusCircle },
  { href: '/admin/statistiche', label: 'Statistiche', icon: BarChart3 },
  { href: '/admin/comunicazioni', label: 'Comunicazioni', icon: Mail },
  { href: '/admin/log', label: 'Log attività', icon: Activity },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (pathname.startsWith(href + '/') && href !== '/admin/dashboard')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-purple-950 text-white font-semibold'
                : 'text-purple-200 hover:bg-purple-800 hover:text-white'
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
