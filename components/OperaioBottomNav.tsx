'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HardHat, Calendar, CalendarDays, Bell, UserCircle, type LucideIcon } from 'lucide-react'

interface Props {
  alertCount: number
}

type NavItem = {
  href: string
  Icon: LucideIcon | null
  label: string
  isNew?: boolean
  isAlert?: boolean
}

const NAV: NavItem[] = [
  { href: '/operaio/dashboard', Icon: HardHat, label: 'Lavori' },
  { href: '/operaio/giornata/nuova', Icon: null, label: 'Giornata', isNew: true },
  { href: '/operaio/domani', Icon: Calendar, label: 'Domani' },
  { href: '/operaio/calendario', Icon: CalendarDays, label: 'Calendario' },
  { href: '/operaio/notifiche', Icon: Bell, label: 'Avvisi', isAlert: true },
  { href: '/operaio/profilo', Icon: UserCircle, label: 'Profilo' },
]

export function OperaioBottomNav({ alertCount }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 safe-area-pb">
      <div className="mx-auto grid max-w-2xl grid-cols-6">
        {NAV.map(item => {
          const isActive = pathname === item.href || (item.href !== '/operaio/dashboard' && pathname.startsWith(item.href))
          const isGiornata = item.href === '/operaio/giornata/nuova'
          const { Icon } = item

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
            >
              {isGiornata ? (
                /* Bottone centrale — CTA principale */
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 shadow-md shadow-emerald-200 -mt-1">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                </div>
              ) : item.isAlert ? (
                /* Avvisi con badge */
                <div className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {Icon && <Icon size={20} className={isActive ? 'text-emerald-700' : 'text-gray-500'} />}
                  {alertCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </div>
              ) : (
                /* Icona normale con contenitore */
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {Icon && <Icon size={20} className={isActive ? 'text-emerald-700' : 'text-gray-500'} />}
                </div>
              )}
              <span className={isGiornata ? 'text-emerald-700 font-bold' : isActive ? 'text-emerald-700' : 'text-gray-500'}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
