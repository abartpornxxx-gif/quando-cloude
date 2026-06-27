'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
    >
      <Printer size={14} /> Stampa / Salva PDF
    </button>
  )
}
