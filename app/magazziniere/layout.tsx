import type { ReactNode } from 'react'

export default function MagazzinoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-yellow-600 text-white px-4 py-3 flex items-center gap-4">
        <span className="font-bold text-lg">📦 Magazzino</span>
        <a href="/magazziniere/dashboard" className="text-sm hover:underline">Dashboard</a>
        <a href="/magazziniere/richieste" className="text-sm hover:underline">Richieste</a>
      </nav>
      {children}
    </div>
  )
}
