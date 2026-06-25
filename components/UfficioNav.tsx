'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  CalendarDays,
  Receipt,
  ChevronDown,
  AlertCircle,
  Building2,
  Menu,
  X,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', href: '/ufficio/dashboard', Icon: LayoutDashboard },
  { label: 'Commesse', href: '/ufficio/commesse', Icon: Building2 },
  { label: 'Preventivi', href: '/ufficio/preventivi', Icon: FileText },
  { label: 'Ordini', href: '/ufficio/ordini', Icon: Package },
  { label: 'Pianificazione', href: '/ufficio/pianificazione', Icon: CalendarDays },
  { label: 'Fatture', href: '/ufficio/fatture', Icon: Receipt },
  { label: 'Saldi', href: '/ufficio/saldi-pendenti', Icon: AlertCircle },
  { label: 'Scadenzario', href: '/ufficio/scadenzario', Icon: CalendarDays },
]

const ANAGRAFICHE = [
  { label: 'Clienti', href: '/ufficio/clienti' },
  { label: 'Fornitori', href: '/ufficio/fornitori' },
  { label: 'Operai', href: '/ufficio/operai' },
]

export function UfficioNav() {
  const pathname = usePathname()
  const [menuAperto, setMenuAperto] = useState(false)
  const chiudiMenu = () => setMenuAperto(false)

  return (
    <>
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
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {NAV.filter(n => n.href !== '/ufficio/dashboard').map(item => {
          if (item.label === 'Fatture') {
            return (
              <div key={item.href} className="group relative">
                <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-600 hover:text-white">
                  <item.Icon size={14} />
                  <span>Fatture</span>
                  <ChevronDown size={12} className="opacity-60 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 pt-1">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                    <Link
                      href="/ufficio/fatture"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      Fatture Attive (Emesse)
                    </Link>
                    <Link
                      href="/ufficio/fatture-passive"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      Fatture Passive (Ricevute)
                    </Link>
                  </div>
                </div>
              </div>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-600 hover:text-white"
            >
              <item.Icon size={14} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Hamburger mobile button */}
      <button
        type="button"
        onClick={() => setMenuAperto(v => !v)}
        className="md:hidden rounded-lg p-2 text-teal-100 hover:bg-teal-600 hover:text-white transition-colors"
        aria-label="Apri menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Drawer Overlay */}
      {menuAperto && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={chiudiMenu}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-teal-700 shrink-0">
              <span className="text-white font-bold text-sm">QUADRO Ufficio</span>
              <button
                type="button"
                onClick={chiudiMenu}
                className="text-teal-100 hover:text-white p-1 rounded transition-colors"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {/* Dashboard */}
              <div>
                <Link
                  href="/ufficio/dashboard"
                  onClick={chiudiMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    pathname === '/ufficio/dashboard'
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard size={16} className="text-teal-600" />
                  Dashboard
                </Link>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-100" />

              {/* Anagrafiche */}
              <div>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Anagrafiche
                </p>
                <div className="space-y-0.5">
                  {ANAGRAFICHE.map(item => {
                    const active = pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={chiudiMenu}
                        className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'bg-teal-50 text-teal-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-100" />

              {/* Operatività */}
              <div>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Operatività
                </p>
                <div className="space-y-0.5">
                  {NAV.filter(n => n.href !== '/ufficio/dashboard').map(item => {
                    if (item.label === 'Fatture') {
                      return (
                        <div key={item.href} className="space-y-0.5">
                          <p className="px-3 py-1 text-xs font-semibold text-gray-500">Fatturazione</p>
                          <Link
                            href="/ufficio/fatture"
                            onClick={chiudiMenu}
                            className={`block rounded-xl px-4 py-2 text-sm transition-colors ${
                              pathname === '/ufficio/fatture'
                                ? 'bg-teal-50 text-teal-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Fatture Attive (Emesse)
                          </Link>
                          <Link
                            href="/ufficio/fatture-passive"
                            onClick={chiudiMenu}
                            className={`block rounded-xl px-4 py-2 text-sm transition-colors ${
                              pathname === '/ufficio/fatture-passive'
                                ? 'bg-teal-50 text-teal-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Fatture Passive (Ricevute)
                          </Link>
                        </div>
                      )
                    }

                    const active = pathname.startsWith(item.href)
                    const { Icon } = item
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={chiudiMenu}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'bg-teal-50 text-teal-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={14} className={active ? 'text-teal-600' : 'text-gray-400'} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
