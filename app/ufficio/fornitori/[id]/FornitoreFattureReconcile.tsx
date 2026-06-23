'use client'

import { useState, useTransition } from 'react'
import { formatEuro, formatData } from '@/lib/format'
import { pagaFatturePassiveInBlocco } from '../actions'

type FatturaPassivaMini = {
  id: string
  numero: string | null
  data: Date
  importo: number
  commessa: { nome: string } | null
}

interface Props {
  fornitoreId: string
  fatture: FatturaPassivaMini[]
}

export function FornitoreFattureReconcile({ fornitoreId, fatture }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  function handleSelectAll() {
    if (selectedIds.size === fatture.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(fatture.map(f => f.id)))
    }
  }

  const selectedCount = selectedIds.size
  const totalSelected = fatture
    .filter(f => selectedIds.has(f.id))
    .reduce((sum, f) => sum + f.importo, 0)

  async function handleBulkPay() {
    if (selectedIds.size === 0) return
    const confirmed = confirm(
      `Sei sicuro di voler segnare ${selectedIds.size} fatture come PAGATE? L'importo totale pagato sarà registrato pari a ${formatEuro(totalSelected)}.`
    )
    if (!confirmed) return

    startTransition(async () => {
      try {
        await pagaFatturePassiveInBlocco(fornitoreId, Array.from(selectedIds))
        setSelectedIds(new Set())
      } catch (err) {
        console.error(err)
        alert("Errore durante la registrazione dei pagamenti. Riprova.")
      }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4 mt-6">
      <div className="flex justify-between items-start border-b border-gray-150 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Riscontro Estratto Conto & Scadenze</h2>
          <p className="text-xs text-gray-500">Spunta le fatture ricevute per riconciliarle e pagarle in blocco</p>
        </div>
        {fatture.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
          >
            {selectedIds.size === fatture.length ? 'Deseleziona tutto' : 'Spunta tutto'}
          </button>
        )}
      </div>

      {fatture.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">Nessuna fattura passiva aperta da pagare per questo fornitore.</p>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl pr-1">
            {fatture.map(f => {
              const isChecked = selectedIds.has(f.id)
              return (
                <label
                  key={f.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer select-none ${
                    isChecked ? 'bg-teal-50/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(f.id)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900">
                      {f.numero ? `Fattura n. ${f.numero}` : 'Fattura senza numero'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Data: {formatData(f.data)} {f.commessa && ` · Cantiere: ${f.commessa.nome}`}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-gray-800 shrink-0">
                    {formatEuro(f.importo)}
                  </p>
                </label>
              )
            })}
          </div>

          {/* Running Totals and actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 bg-gray-50 p-4 rounded-xl border border-gray-150">
            <div>
              <p className="text-xs text-gray-500">Fatture selezionate: <strong className="text-gray-900">{selectedCount}</strong></p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                Totale riscontro: <span className="text-teal-700">{formatEuro(totalSelected)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleBulkPay}
              disabled={selectedCount === 0 || isPending}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-center"
            >
              {isPending ? 'Registrazione...' : 'Segna come pagate'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
