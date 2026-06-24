'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, BookOpen, X } from 'lucide-react'

interface OnboardingGuidaProps {
  role: 'impresa' | 'ufficio' | 'operaio' | 'magazziniere' | 'cliente'
  title: string
  subtitle: string
  features: string[]
  actions: string[]
  finalMessage: string
  localStorageKey: string
}

export function OnboardingGuida({
  role,
  title,
  subtitle,
  features,
  actions,
  finalMessage,
  localStorageKey,
}: OnboardingGuidaProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Rendiamo il componente sicuro rispetto all'idratazione client-side ed
    // evitiamo mismatch tra render server e render client iniziale
    setIsMounted(true)
    const seen = localStorage.getItem(localStorageKey)
    if (seen !== 'true') {
      setVisible(true)
    }
  }, [localStorageKey])

  if (!isMounted) return null

  // Mappa dei colori per ciascun ruolo
  const themeMap = {
    impresa: {
      bg: 'bg-slate-50 border-slate-200',
      titleText: 'text-slate-900',
      accentText: 'text-slate-600',
      badge: 'bg-slate-100 text-slate-800',
      button: 'bg-slate-800 hover:bg-slate-900 text-white',
      linkHover: 'hover:text-slate-700',
      dot: 'bg-slate-500',
    },
    ufficio: {
      bg: 'bg-teal-50 border-teal-200',
      titleText: 'text-teal-950',
      accentText: 'text-teal-700',
      badge: 'bg-teal-100 text-teal-800',
      button: 'bg-teal-700 hover:bg-teal-800 text-white',
      linkHover: 'hover:text-teal-700',
      dot: 'bg-teal-550',
    },
    operaio: {
      bg: 'bg-emerald-50 border-emerald-200',
      titleText: 'text-emerald-950',
      accentText: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800',
      button: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      linkHover: 'hover:text-emerald-700',
      dot: 'bg-emerald-500',
    },
    magazziniere: {
      bg: 'bg-amber-50 border-amber-200',
      titleText: 'text-amber-950',
      accentText: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800',
      button: 'bg-amber-750 hover:bg-amber-800 text-white',
      linkHover: 'hover:text-amber-700',
      dot: 'bg-amber-600',
    },
    cliente: {
      bg: 'bg-violet-50 border-violet-200',
      titleText: 'text-violet-950',
      accentText: 'text-violet-700',
      badge: 'bg-violet-100 text-violet-800',
      button: 'bg-violet-700 hover:bg-violet-800 text-white',
      linkHover: 'hover:text-violet-700',
      dot: 'bg-violet-500',
    },
  }

  const currentTheme = themeMap[role]

  const handleDismissTemporarily = () => {
    setVisible(false)
  }

  const handleDismissPermanently = () => {
    localStorage.setItem(localStorageKey, 'true')
    setVisible(false)
  }

  const handleResetGuidance = () => {
    localStorage.removeItem(localStorageKey)
    setVisible(true)
  }

  // Renderizza sempre un piccolo pulsante discreto quando la guida è stata chiusa,
  // riducendo il rischio di hydration mismatch caricandolo solo client-side dopo il mount.
  if (!visible) {
    return (
      <div className="flex justify-end pt-1 pr-1" data-no-print>
        <button
          onClick={handleResetGuidance}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-gray-100/60"
          title="Rivedi guida onboarding"
        >
          <span>📖 Rivedi guida</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border ${currentTheme.bg} p-5 md:p-6 shadow-sm space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2`}
      data-no-print
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className={`text-base md:text-lg font-black tracking-tight ${currentTheme.titleText}`}>
            {title}
          </h2>
          <p className="text-xs md:text-sm text-gray-500 font-medium">{subtitle}</p>
        </div>
        <button
          onClick={handleDismissTemporarily}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
          title="Chiudi guida per ora"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 pt-1">
        {/* Cosa puoi fare */}
        <div className="space-y-2.5">
          <p className={`text-xs font-bold uppercase tracking-wider ${currentTheme.accentText}`}>
            Cosa puoi fare in QUADRO
          </p>
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <span className={`h-1.5 w-1.5 rounded-full ${currentTheme.dot} shrink-0 mt-2`} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prime azioni */}
        <div className="space-y-2.5">
          <p className={`text-xs font-bold uppercase tracking-wider ${currentTheme.accentText}`}>
            Prime azioni consigliate
          </p>
          <ul className="space-y-2">
            {actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 font-medium">
                <span className="text-xs shrink-0 mt-0.5">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Messaggio finale e azioni di chiusura */}
      <div className="border-t border-gray-200/50 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs md:text-sm italic text-gray-500 font-medium">
          {finalMessage}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismissTemporarily}
            className="flex-1 sm:flex-initial rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 shadow-xs cursor-pointer transition-colors"
          >
            Chiudi temporaneamente
          </button>
          <button
            onClick={handleDismissPermanently}
            className={`flex-1 sm:flex-initial rounded-xl ${currentTheme.button} px-4 py-2 text-xs font-bold shadow-xs cursor-pointer transition-colors`}
          >
            Ho capito, non mostrare più
          </button>
        </div>
      </div>
    </div>
  )
}
