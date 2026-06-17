'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
    >
      🖨 Stampa / Salva PDF
    </button>
  )
}
