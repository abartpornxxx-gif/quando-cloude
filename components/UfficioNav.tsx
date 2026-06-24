'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  HardHat,
  Users,
  Package,
  Receipt,
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
    label: 'Cantieri',
    Icon: HardHat,
    iconBg: 'bg-amber-100',
    iconCls: 'text-amber-600',
    dot: 'bg-amber-400',
    prefixes: ['/ufficio/commesse', '/ufficio/preventivi', '/ufficio/pianificazione'],
    items: [
      { label: 'Commesse', href: '/ufficio/commesse', desc: 'Cantieri aperti' },
      { label: 'Preventivi', href: '/ufficio/preventivi', desc: 'Offerte ai clienti' },
      { label: 'Pianificazione', href: '/ufficio/pianificazione', desc: 'Chi lavora e quando' },
    ],
  },
  {
    label: 'Persone',
    Icon: Users,
    iconBg: 'bg-violet-100',
    iconCls: 'text-violet-600',
    dot: 'bg-violet-400',
    prefixes: ['/ufficio/clienti', '/ufficio/operai', '/ufficio/fornitori'],
    items: [
      { label: 'Clienti', href: '/ufficio/clienti', desc: 'Anagrafica' },
      { label: 'Operai', href: '/ufficio/operai', desc: 'Squadre e ore' },
      { label: 'Fornitori', href: '/ufficio/fornitori', desc: 'Anagrafica fornitori' },
    ],
  },
  {
    label: 'Magazzino',
    Icon: Package,
    iconBg: 'bg-cyan-100',
    iconCls: 'text-cyan-600',
    dot: 'bg-cyan-500',
    prefixes: ['/ufficio/ordini'],
    items: [
      { label: 'Ordini', href: '/ufficio/ordini', desc: 'Ordini a fornitori' },
    ],
  },
  {
    label: 'Finanza',
    Icon: Receipt,
    iconBg: 'bg-emerald-100',
    iconCls: 'text-emerald-600',
    dot: 'bg-emerald-500',
    prefixes: ['/ufficio/fatture', '/ufficio/fatture-passive', '/ufficio/scadenzario', '/ufficio/saldi-pendenti'],
    items: [
      { label: 'Fatture', href: '/ufficio/fatture', desc: 'Da incassare' },
      { label: 'F. Passive', href: '/ufficio/fatture-passive', desc: 'Da pagare' },
      { label: 'Scadenzario', href: '/ufficio/scadenzario', desc: 'Tutte le scadenze' },
      { label: 'Saldi pendenti', href: '/ufficio/saldi-pendenti', desc: 'Crediti e debiti' },
    ],
  },
]

export function UfficioNav() {
  const pathname = usePathname()
  const isDashboard = pathname === '/ufficio/dashboard'
  const [menuAperto, setMenuAperto] = useState(false)

  const chiudiMenu = () => setMenuAperto(false)

  return (
    <div className="border-t border-teal-700/60 bg-teal-800">
      {/* ── Desktop: barra orizzontale con dropdown ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex items-stretch">
          {/* Dashboard link */}
          <Link
            href="/ufficio/dashboard"
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isDashboard
                ? 'border-teal-400 text-teal-200'
                : 'border-transparent text-teal-100 hover:text-white'
            }`}
          >
            <LayoutDashboard size={13} className={isDashboard ? 'text-teal-200' : 'text-teal-300'} />
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
                      ? 'border-teal-400 text-teal-200'
                      : 'border-transparent text-teal-100 hover:text-white'
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
                              ? 'bg-teal-50 text-teal-700'
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
                    <span className="text-sm text-teal-100 font-medium">{activeMacro.label}</span>
                  </>
                )
              }
              return <span className="text-sm text-teal-100 font-medium">Dashboard</span>
            })()}
          </div>
          <button
            onClick={() => setMenuAperto(v => !v)}
            className="rounded-lg p-2 text-teal-100 hover:bg-teal-700 hover:text-white transition-colors"
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

          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header pannello */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-teal-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Image src="/immagini/logo-quadro.png" width={24} height={24} alt="" className="rounded-lg" />
                <span className="text-white font-bold text-sm">QUADRO Ufficio</span>
              </div>
              <button onClick={chiudiMenu} className="text-teal-200 hover:text-white p-1 rounded transition-colors" aria-label="Chiudi">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto py-3">
              {/* Dashboard */}
              <div className="px-3 mb-3">
                <Link
                  href="/ufficio/dashboard"
                  onClick={chiudiMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isDashboard ? 'bg-teal-50 text-teal-700' : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 shrink-0">
                    <LayoutDashboard size={16} className="text-teal-600" />
                  </div>
                  Dashboard
                </Link>
              </div>

              {/* Separatore */}
              <div className="mx-4 border-t border-gray-100 mb-3" />

              {/* Categorie */}
              {MACRO.map(macro => {
                const macroActive = macro.prefixes.some(p => pathname.startsWith(p))
                const { Icon } = macro
                return (
                  <div key={macro.label} className="px-3 mb-3">
                    {/* Category header */}
                    <div className="flex items-center gap-2 px-3 mb-1.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${macro.iconBg}`}>
                        <Icon size={14} className={macro.iconCls} />
                      </div>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${macroActive ? 'text-teal-700' : 'text-gray-400'}`}>
                        {macro.label}
                      </p>
                    </div>
                    {/* Items */}
                    <div className="space-y-0.5">
                      {macro.items.map(item => {
                        const itemActive = pathname.startsWith(item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={chiudiMenu}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                              itemActive
                                ? 'bg-teal-50 text-teal-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span>{item.label}</span>
                            <span className="text-[11px] text-gray-400 shrink-0 ml-2">{item.desc}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
