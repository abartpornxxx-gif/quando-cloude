'use client'

import { useState, useTransition } from 'react'
import { registraIncasso } from '../actions'
import { euroToCents } from '@/lib/format'

export default function RegistraIncassoForm({
  fatturaId,
  totaleFattura,
}: {
  fatturaId: string
  totaleFattura: number
}) {
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)

  const oggi = new Date().toISOString().slice(0, 10)
  const [dataIncasso, setDataIncasso] = useState(oggi)
  const [importo, setImporto] = useState((totaleFattura / 100).toFixed(2))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = euroToCents(importo)
    if (!dataIncasso) { setErrore('Inserisci la data del bonifico'); return }
    if (cents <= 0) { setErrore('Importo non valido'); return }
    setErrore('')
    startTransition(async () => {
      try {
        await registraIncasso(fatturaId, dataIncasso, cents)
        setSuccesso(true)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  if (successo) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-4">
        <p className="text-green-800 font-semibold">✓ Incasso registrato. Aggiorna la pagina per vedere lo stato aggiornato.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Registra incasso (bonifico ricevuto)</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Data bonifico *</label>
          <input
            type="date"
            value={dataIncasso}
            onChange={e => setDataIncasso(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Importo incassato (€) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={importo}
            onChange={e => setImporto(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
      </div>
      {errore && <p className="text-red-600 text-sm">{errore}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {pending ? 'Salvataggio…' : 'Conferma incasso'}
      </button>
    </form>
  )
}
