import Link from 'next/link'
import { Bell } from 'lucide-react'
import { AudioNotifica } from './AudioNotifica'

interface Props {
  count: number
  href: string
  colore?: 'blue' | 'emerald' | 'yellow' | 'violet'
}

export function NotificheBell({ count, href, colore = 'blue' }: Props) {
  const ringCls = {
    blue: 'hover:bg-blue-600',
    emerald: 'hover:bg-emerald-600',
    yellow: 'hover:bg-yellow-500',
    violet: 'hover:bg-violet-600',
  }[colore]

  return (
    <>
      <AudioNotifica count={count} />
      <Link href={href} className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${ringCls} transition-colors`} title="Notifiche">
        <Bell size={18} className="text-white" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </>
  )
}
