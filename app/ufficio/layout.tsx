import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { NotificheBell } from '@/components/NotificheBell'
import Link from 'next/link'
import { LogoutButton } from '@/components/LogoutButton'
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  CalendarDays,
  Receipt,
  ChevronDown,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', href: '/ufficio/dashboard', Icon: LayoutDashboard },
  { label: 'Preventivi', href: '/ufficio/preventivi', Icon: FileText },
  { label: 'Ordini', href: '/ufficio/ordini', Icon: Package },
  { label: 'Pianificazione', href: '/ufficio/pianificazione', Icon: CalendarDays },
  { label: 'Fatture', href: '/ufficio/fatture', Icon: Receipt },
]

const ANAGRAFICHE = [
  { label: 'Clienti', href: '/ufficio/clienti' },
  { label: 'Fornitori', href: '/ufficio/fornitori' },
  { label: 'Operai', href: '/ufficio/operai' },
]

export default async function UfficioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'ufficio') redirect('/login')

  const nome = user.user_metadata?.full_name ?? user.email ?? 'Ufficio'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-teal-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/ufficio/dashboard" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500 shadow-sm shrink-0">
                <Image src="/immagini/logo-quadro.png" width={28} height={28} alt="QUADRO" className="rounded-lg" priority />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-white tracking-tight">QUADRO</span>
                <span className="hidden sm:block text-xs font-medium text-teal-200">Ufficio</span>
              </div>
            </Link>

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-0.5">
              {/* Anagrafiche dropdown */}
              <div className="group relative">
                <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-600 hover:text-white">
                  <Users size={14} />
                  <span>Anagrafiche</span>
                  <ChevronDown size={12} className="opacity-60 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 pt-1">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                    {ANAGRAFICHE.map(item => (
                      <Link key={item.href} href={item.href}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {NAV.filter(n => n.href !== '/ufficio/dashboard').map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-600 hover:text-white">
                  <item.Icon size={14} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden lg:block text-sm text-teal-200 truncate max-w-32">{nome.split(' ')[0]}</span>
              <NotificheBell count={0} href="#" colore="emerald" />
              <LogoutButton className="rounded-lg px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-600 hover:text-white" />
            </div>
          </div>
        </div>

        {/* Nav mobile */}
        <div className="md:hidden border-t border-teal-600/50">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex overflow-x-auto scrollbar-none gap-0.5 py-1">
              <Link href="/ufficio/clienti" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">Clienti</Link>
              <Link href="/ufficio/fornitori" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">Fornitori</Link>
              <Link href="/ufficio/operai" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">Operai</Link>
              <Link href="/ufficio/preventivi" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">Preventivi</Link>
              <Link href="/ufficio/ordini" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">Ordini</Link>
              <Link href="/ufficio/pianificazione" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">Pianificazione</Link>
              <Link href="/ufficio/fatture" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">Fatture</Link>
              <Link href="/ufficio/fatture-passive" className="shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium text-teal-200 hover:text-white">F. Passive</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
