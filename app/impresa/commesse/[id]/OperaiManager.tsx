'use client'

import { useTransition, useState } from 'react'
import { assegnaOperaio, rimuoviAssegnazione } from '../actions'
import { DeleteButton } from '@/components/DeleteButton'

interface Props {
  commessaId: string
  assegnati: { operaioId: string; nome: string; ruolo: string | null }[]
  disponibili: { id: string; nome: string; ruolo: string | null }[]
}

export function OperaiManager({ commessaId, assegnati, disponibili }: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [pending, start] = useTransition()

  function handleAssegna() {
    if (!selectedId) return
    start(async () => {
      await assegnaOperaio(commessaId, selectedId)
      setSelectedId('')
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-800">Operai assegnati al cantiere</h2>
      </div>
      <div className="p-5 space-y-2">
        {assegnati.length === 0 && (
          <p className="text-sm text-gray-400 py-2">Nessun operaio assegnato ancora.</p>
        )}
        {assegnati.map(a => (
          <div
            key={a.operaioId}
            className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{a.nome}</p>
              {a.ruolo && <p className="text-xs text-gray-500">{a.ruolo}</p>}
            </div>
            <DeleteButton
              action={rimuoviAssegnazione.bind(null, commessaId, a.operaioId)}
              label="Rimuovi"
            />
          </div>
        ))}

        {disponibili.length > 0 && (
          <div className="flex gap-2 pt-2">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              disabled={pending}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Aggiungi operaio —</option>
              {disponibili.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nome}{o.ruolo ? ` (${o.ruolo})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAssegna}
              disabled={pending || !selectedId}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {pending ? '…' : 'Assegna'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
