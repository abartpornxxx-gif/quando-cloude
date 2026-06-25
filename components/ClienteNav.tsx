'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const NAV = [
  { label: 'I miei lavori', href: '/cliente/lavori' },
  { label: 'Pagamenti', href: '/cliente/pagamenti' },
  { label: 'Documenti', href: '/cliente/documenti' },
  { label: 'Servizi', href: '/cliente/servizi' },
  { label: 'Manutenzioni', href: '/cliente/manutenzioni' },
]

export function ClienteNav() {
  const pathname = usePathname()
  const [menuAperto, setMenuAperto] = useState(false)
  const chiudiMenu = () => setMenuAperto(false)

  return (
    <>
      {/* Nav desktop */}
      <nav className="hidden sm:flex items-center gap-0.5">
        {NAV.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-violet-600 text-white'
                  : 'text-violet-200 hover:bg-violet-600 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Hamburger mobile button */}
      <button
        type="button"
        onClick={() => setMenuAperto(v => !v)}
        className="sm:hidden rounded-lg p-2 text-violet-100 hover:bg-violet-600 hover:text-white transition-colors"
        aria-label="Apri menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Drawer Overlay */}
      {menuAperto && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={chiudiMenu}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-violet-700 shrink-0">
              <span className="text-white font-bold text-sm">QUADRO Portale</span>
              <button
                type="button"
                onClick={chiudiMenu}
                className="text-violet-100 hover:text-white p-1 rounded transition-colors"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              <div>
                <Link
                  href="/cliente/dashboard"
                  onClick={chiudiMenu}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    pathname === '/cliente/dashboard'
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-100" />

              <div>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Sezioni
                </p>
                <div className="space-y-0.5">
                  {NAV.map(item => {
                    const active = pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={chiudiMenu}
                        className={`block rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? 'bg-violet-50 text-violet-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
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
