'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { AdminUser } from '@/app/admin/actions'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_LABELS: Record<string, { label: string; variant: 'info' | 'success' | 'purple' | 'warning' | 'neutral' | 'danger' }> = {
  impresa:      { label: 'Impresa',       variant: 'info' },
  operaio:      { label: 'Operaio',       variant: 'success' },
  cliente:      { label: 'Cliente',       variant: 'purple' },
  magazziniere: { label: 'Magazziniere',  variant: 'warning' },
  ufficio:      { label: 'Ufficio',       variant: 'neutral' },
  libero:       { label: 'Libero Prof.',  variant: 'warning' },
}

const inputClass =
  'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors'

interface Props {
  users: AdminUser[]
}

export function UtentiList({ users }: Props) {
  const [search, setSearch] = useState('')
  const [filterRuolo, setFilterRuolo] = useState('tutti')
  const [filterStato, setFilterStato] = useState('tutti')

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search) {
        const q = search.toLowerCase()
        if (!u.email.toLowerCase().includes(q) && !u.nome.toLowerCase().includes(q)) return false
      }
      if (filterRuolo !== 'tutti' && u.role !== filterRuolo) return false
      if (filterStato === 'attivi' && (u.banned || !u.email_confirmed)) return false
      if (filterStato === 'sospesi' && !u.banned) return false
      if (filterStato === 'non_confermati' && u.email_confirmed) return false
      return true
    })
  }, [users, search, filterRuolo, filterStato])

  return (
    <div className="space-y-4">
      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per email o nome…"
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        <select
          value={filterRuolo}
          onChange={e => setFilterRuolo(e.target.value)}
          className={inputClass}
        >
          <option value="tutti">Tutti i ruoli</option>
          <option value="impresa">Impresa</option>
          <option value="operaio">Operaio</option>
          <option value="cliente">Cliente</option>
          <option value="magazziniere">Magazziniere</option>
          <option value="ufficio">Ufficio</option>
          <option value="libero">Libero</option>
        </select>
        <select
          value={filterStato}
          onChange={e => setFilterStato(e.target.value)}
          className={inputClass}
        >
          <option value="tutti">Tutti gli stati</option>
          <option value="attivi">Attivi</option>
          <option value="sospesi">Sospesi</option>
          <option value="non_confermati">Email non confermata</option>
        </select>
      </div>

      {/* Contatore */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {filtered.length} {filtered.length === 1 ? 'utente trovato' : 'utenti trovati'}
      </p>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-12 text-center">
          <p className="text-sm text-gray-500">Nessun utente trovato per i filtri selezionati</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map(u => {
              const info = ROLE_LABELS[u.role] || { label: u.role, variant: 'neutral' as const }
              return (
                <Link
                  key={u.id}
                  href={`/admin/utenti/${u.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-700">
                      {(u.nome || u.email || '?')[0].toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.nome || '—'}</p>
                      {u.banned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={10} /> Sospeso
                        </span>
                      )}
                      {!u.email_confirmed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                          Email non confermata
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={info.variant}>{info.label}</Badge>
                    <span className="text-[10px] text-gray-400">Iscritto {fmt(u.created_at)}</span>
                    <span className="text-[10px] text-gray-400">
                      Ultimo accesso: {fmt(u.last_sign_in_at)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
