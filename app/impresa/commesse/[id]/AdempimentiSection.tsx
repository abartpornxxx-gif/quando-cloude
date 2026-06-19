'use client'

import { useTransition, useState } from 'react'
import {
  applicaChecklist,
  toggleAdempimento,
  aggiungiAdempimentoCustom,
  eliminaAdempimento,
} from './adempimenti-actions'

type Adempimento = {
  id: string
  testo: string
  note: string | null
  collegamento: string | null
  fatto: boolean
  fattoDa: string | null
  fattoAt: Date | null
  notaSpunta: string | null
  modelloId: string | null
}

type Props = {
  commessaId: string
  tipoLavoro: { id: string; nome: string } | null
  adempimenti: Adempimento[]
}

function formatDate(d: Date | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function AdempimentiSection({ commessaId, tipoLavoro, adempimenti }: Props) {
  const [pending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)

  const fatte = adempimenti.filter(a => a.fatto).length
  const totale = adempimenti.length
  const pct = totale > 0 ? Math.round((fatte / totale) * 100) : 0

  function handleApplica() {
    startTransition(async () => {
      try {
        await applicaChecklist(commessaId)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Errore durante l\'applicazione della checklist')
      }
    })
  }

  function handleToggle(id: string, fatto: boolean) {
    startTransition(async () => {
      await toggleAdempimento(id, commessaId, fatto)
    })
  }

  function handleElimina(id: string) {
    if (!confirm('Rimuovere questo adempimento dalla commessa?')) return
    startTransition(async () => {
      await eliminaAdempimento(id, commessaId)
    })
  }

  async function handleAddCustom(fd: FormData) {
    startTransition(async () => {
      try {
        await aggiungiAdempimentoCustom(commessaId, fd)
        setShowAdd(false)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Adempimenti di cantiere</h2>
            {tipoLavoro && (
              <p className="text-xs text-gray-400 mt-0.5">Tipo lavoro: {tipoLavoro.nome}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tipoLavoro && (
              <button
                onClick={handleApplica}
                disabled={pending}
                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {pending ? 'Applicando…' : `Applica checklist ${tipoLavoro.nome}`}
              </button>
            )}
            <button
              onClick={() => setShowAdd(v => !v)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              + Voce custom
            </button>
          </div>
        </div>

        {/* Barra di avanzamento */}
        {totale > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">{fatte} di {totale} completati</span>
              <span className={`text-xs font-bold ${pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lista adempimenti */}
      {adempimenti.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">Nessun adempimento ancora.</p>
          {tipoLavoro && (
            <p className="text-xs text-gray-400 mt-1">
              Clicca &quot;Applica checklist {tipoLavoro.nome}&quot; per aggiungere le voci dal modello.
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {adempimenti.map((a, i) => (
            <div key={a.id} className={`flex items-start gap-3 px-5 py-3.5 ${a.fatto ? 'bg-emerald-50/50' : ''}`}>
              <button
                onClick={() => handleToggle(a.id, !a.fatto)}
                disabled={pending}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  a.fatto
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-300 bg-white hover:border-blue-400'
                }`}
              >
                {a.fatto && (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 12 12">
                    <path d="M1.5 6l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${a.fatto ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {a.testo}
                </p>
                {a.note && <p className="text-xs text-gray-400 mt-0.5">{a.note}</p>}
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {a.collegamento === 'dico' && (
                    <span className="text-xs text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">DiCo</span>
                  )}
                  {a.collegamento === 'foto' && (
                    <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">📷 Foto</span>
                  )}
                  {a.fatto && a.fattoDa && (
                    <span className="text-xs text-emerald-600">
                      ✓ {a.fattoDa} — {formatDate(a.fattoAt)}
                    </span>
                  )}
                  {a.notaSpunta && (
                    <span className="text-xs text-gray-500 italic">&quot;{a.notaSpunta}&quot;</span>
                  )}
                  {!a.modelloId && (
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">custom</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleElimina(a.id)}
                disabled={pending}
                className="shrink-0 text-xs text-gray-300 hover:text-red-400 transition-colors px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form aggiunta voce custom */}
      {showAdd && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Voce personalizzata</p>
          <form action={handleAddCustom} className="space-y-3">
            <input
              name="testo"
              required
              placeholder="Descrizione dell&apos;adempimento *"
              className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="note"
                placeholder="Note (opzionale)"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                name="collegamento"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— Nessun collegamento —</option>
                <option value="dico">Dichiarazione di Conformità</option>
                <option value="foto">Richiede foto</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
              >
                Aggiungi
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
