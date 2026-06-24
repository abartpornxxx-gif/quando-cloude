'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Inbox,
  Warehouse,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

type MacroEntry = {
  label: string
  Icon: LucideIcon
  iconBg: string
  iconCls: string
  dot: string
  prefixes: string[]
  items: { label: string; href: string; desc: string }[]
}

const MACRO: MacroEntry[] = [
  {
    label: 'Operazioni',
    Icon: Inbox,
    iconBg: 'bg-orange-100',
    iconCls: 'text-orange-600',
    dot: 'bg-orange-500',
    prefixes: ['/magazziniere/richieste'],
    items: [
      { label: 'Richieste', href: '/magazziniere/richieste', desc: 'Materiale dagli operai' },
    ],
  },
  {
    label: 'Inventario',
    Icon: Warehouse,
    iconBg: 'bg-amber-100',
    iconCls: 'text-amber-700',
    dot: 'bg-amber-550 bg-amber-600',
    prefixes: ['/magazziniere/magazzino'],
    items: [
      { label: 'Giacenza', href: '/magazziniere/magazzino', desc: 'Inventario e giacenze' },
    ],
  },
]

export function MagazziniereNav() {
  const pathname = usePathname()
  const isDashboard = pathname === '/magazziniere/dashboard'
  const [menuAperto, setMenuAperto] = useState(false)

  const chiudiMenu = () => setMenuAperto(false)

  return (
    <div className="border-t border-amber-800/60 bg-amber-800">
      {/* ── Desktop: barra orizzontale con dropdown ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex items-stretch">
          {/* Dashboard link */}
          <Link
            href="/magazziniere/dashboard"
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isDashboard
                ? 'border-amber-400 text-amber-250 text-amber-200'
                : 'border-transparent text-amber-100 hover:text-white'
            }`}
          >
            <LayoutDashboard size={13} className={isDashboard ? 'text-amber-200' : 'text-amber-300'} />
            Dashboard
          </Link>

          {/* Macro-categorie con dropdown */}
          {MACRO.map(macro => {
            const isActive = macro.prefixes.some(p => pathname.startsWith(p))
            const { Icon } = macro
            return (
              <div key={macro.label} className="group relative flex items-stretch">
                <button
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-amber-400 text-amber-200'
                      : 'border-transparent text-amber-100 hover:text-white'
                  }`}
                >
                  {/* Colored dot indicator */}
                  <span className={`h-2 w-2 rounded-full shrink-0 ${macro.dot} opacity-80`} />
                  {macro.label}
                  <svg className="h-3 w-3 opacity-50 transition-transform group-hover:rotate-180" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 4l4 4 4-4" />
                  </svg>
                </button>

                <div className="absolute top-full left-0 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 pt-1">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[220px]">
                    {/* Dropdown header */}
                    <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 ${macro.iconBg}`}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70">
                        <Icon size={16} className={macro.iconCls} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{macro.label}</span>
                    </div>
                    {macro.items.map(item => {
                      const itemActive = pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                            itemActive
                              ? 'bg-amber-50 text-amber-800'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs text-gray-400 ml-3">{item.desc}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Mobile: riga con sezione attiva + hamburger ── */}
        <div className="md:hidden flex items-center justify-between px-0 py-2">
          <div className="flex items-center gap-2">
            {(() => {
              const activeMacro = MACRO.find(m => m.prefixes.some(p => pathname.startsWith(p)))
              if (activeMacro) {
                const { Icon } = activeMacro
                return (
                  <>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${activeMacro.iconBg}`}>
                      <Icon size={13} className={activeMacro.iconCls} />
                    </div>
                    <span className="text-sm text-amber-100 font-medium">{activeMacro.label}</span>
                  </>
                )
              }
              return <span className="text-sm text-amber-100 font-medium">Dashboard</span>
            })()}
          </div>
          <button
            onClick={() => setMenuAperto(v => !v)}
            className="rounded-lg p-2 text-amber-100 hover:bg-amber-700 hover:text-white transition-colors"
            aria-label="Apri menu"
          >
            {menuAperto ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {menuAperto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={chiudiMenu} aria-hidden="true" />

          <div className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white p-5 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-lg">Menu Portale</span>
                </div>
                <button onClick={chiudiMenu} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Chiudi menu">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <nav className="space-y-5 overflow-y-auto max-h-[70vh]">
                <Link
                  href="/magazziniere/dashboard"
                  onClick={chiudiMenu}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isDashboard ? 'bg-amber-50 text-amber-800' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>

                {MACRO.map(macro => {
                  const { Icon } = macro
                  return (
                    <div key={macro.label} className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <Icon size={12} />
                        {macro.label}
                      </div>
                      <div className="space-y-1 pl-3 border-l border-gray-100 ml-5">
                        {macro.items.map(item => {
                          const itemActive = pathname.startsWith(item.href)
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={chiudiMenu}
                              className={`block px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                itemActive ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {item.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
