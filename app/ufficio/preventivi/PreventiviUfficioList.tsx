'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'
import { DeleteButton } from '@/components/DeleteButton'
import { Badge } from '@/components/ui/Badge'
import { eliminaPreventivoUfficio } from './actions'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const STATO_LABEL: Record<string, string> = {
  bozza: 'Bozza', inviato: 'Inviato', accettato: 'Accettato',
  rifiutato: 'Rifiutato', scaduto: 'Scaduto',
}
const STATO_VARIANT: Record<string, BadgeVariant> = {
  bozza: 'neutral', inviato: 'info', accettato: 'success',
  rifiutato: 'danger', scaduto: 'warning',
}

type PreventivoRiga = { quantita: number; prezzoUnitario: number }
type Preventivo = {
  id: string
  data: Date
  stato: string
  note: string | null
  cliente: { nome: string } | null
  commessa: { id: string; nome: string } | null
  righe: PreventivoRiga[]
}

export default function PreventiviUfficioList({ preventivi }: { preventivi: Preventivo[] }) {
  const [query, setQuery] = useState('')
  const [filtroStato, setFiltroStato] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = preventivi.filter(p => {
    if (filtroStato && p.stato !== filtroStato) return false
    if (!q) return true
    const haystack = [
      p.cliente?.nome ?? '',
      p.note ?? '',
      p.commessa?.nome ?? '',
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })

  return (
    <div className="space-y-3">
      {/* Barra ricerca */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca cliente, oggetto, commessa..."
          className="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <select
          value={filtroStato}
          onChange={e => setFiltroStato(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
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
          <p className="text-sm text-gray-400">Nessun preventivo trovato.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                <div className="shrink-0 text-center w-14 hidden sm:block">
                  <p className="text-sm font-bold text-gray-700 leading-none">
                    {new Date(p.data).getDate().toString().padStart(2, '0')}/{(new Date(p.data).getMonth() + 1).toString().padStart(2, '0')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(p.data).getFullYear()}</p>
                </div>
                <Link href={`/ufficio/preventivi/${p.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors truncate">
                      {p.cliente?.nome ?? 'Cliente non specificato'}
                    </span>
                    <Badge variant={STATO_VARIANT[p.stato]}>{STATO_LABEL[p.stato]}</Badge>
                    {p.commessa && (
                      <span className="text-xs text-gray-400 truncate">→ {p.commessa.nome}</span>
                    )}
                  </div>
                  {p.note
                    ? <p className="text-xs text-gray-400 mt-0.5 truncate">{p.note}</p>
                    : <p className="text-xs text-gray-400 mt-0.5">{formatData(p.data)}</p>
                  }
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <Link href={`/ufficio/preventivi/${p.id}`} className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatEuro(calcolaTotalePreventivo(p.righe))}</p>
                    <p className="text-xs text-gray-400">{p.righe.length} {p.righe.length === 1 ? 'riga' : 'righe'}</p>
                  </Link>
                  <DeleteButton action={eliminaPreventivoUfficio.bind(null, p.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 text-right">{filtered.length} di {preventivi.length}</p>
    </div>
  )
}
