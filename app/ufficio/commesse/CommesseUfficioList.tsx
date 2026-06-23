'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'success' | 'warning' | 'neutral'

const STATO_LABEL: Record<string, string> = { aperta: 'Aperta', finita: 'Finita', chiusa: 'Chiusa' }
const STATO_VARIANT: Record<string, BadgeVariant> = { aperta: 'success', finita: 'warning', chiusa: 'neutral' }

type Commessa = {
  id: string
  nome: string
  stato: string
  preventivato: number
  fatturato: number
  costiMateriali: number
  costiManodopera: number
  cliente: { nome: string } | null
  _count: { giornate: number; fattureAttive: number }
}

export default function CommesseUfficioList({ commesse }: { commesse: Commessa[] }) {
  const [query, setQuery] = useState('')
  const [filtroStato, setFiltroStato] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = commesse.filter(c => {
    if (filtroStato && c.stato !== filtroStato) return false
    if (!q) return true
    return [c.nome, c.cliente?.nome ?? ''].join(' ').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-3">
      {/* Barra ricerca */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca nome cantiere o cliente..."
          className="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <select
          value={filtroStato}
          onChange={e => setFiltroStato(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="">Tutti gli stati</option>
          <option value="aperta">Aperta</option>
          <option value="finita">Finita</option>
          <option value="chiusa">Chiusa</option>
        </select>
        {(query || filtroStato) && (
          <button
            onClick={() => { setQuery(''); setFiltroStato('') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Azzera
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center">
          <p className="text-sm text-gray-400">Nessuna commessa trovata.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
          {filtered.map(c => {
            const residuo = c.preventivato - c.fatturato
            return (
              <Link
                key={c.id}
                href={`/ufficio/commesse/${c.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                      {c.nome}
                    </span>
                    <Badge variant={STATO_VARIANT[c.stato]}>{STATO_LABEL[c.stato]}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {c.cliente && <p className="text-xs text-gray-500">{c.cliente.nome}</p>}
                    <p className="text-xs text-gray-400">{c._count.giornate} giornate · {c._count.fattureAttive} fatture</p>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">{formatEuro(c.preventivato)}</p>
                  {residuo > 0 && c.stato !== 'aperta' && (
                    <p className="text-xs text-amber-600 font-medium">Residuo: {formatEuro(residuo)}</p>
                  )}
                  {c.fatturato > 0 && residuo <= 0 && (
                    <p className="text-xs text-emerald-600 font-medium">Saldato</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 text-right">{filtered.length} di {commesse.length}</p>
    </div>
  )
}
