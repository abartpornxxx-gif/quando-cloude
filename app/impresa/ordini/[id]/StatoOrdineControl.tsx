'use client'

import { useState, useTransition } from 'react'
import { avanzaStatoOrdine, eliminaOrdine } from '../actions'
import { useRouter } from 'next/navigation'

const TRANSIZIONI: Record<string, { label: string; nuovoStato: 'ordinato' | 'consegnato' | 'usato'; color: string }> = {
  richiesto:  { label: 'Segna come ORDINATO',   nuovoStato: 'ordinato',   color: 'bg-yellow-500 text-white' },
  ordinato:   { label: 'Segna come CONSEGNATO', nuovoStato: 'consegnato', color: 'bg-green-600 text-white' },
  consegnato: { label: 'Segna come USATO',      nuovoStato: 'usato',      color: 'bg-blue-600 text-white' },
}

export default function StatoOrdineControl({
  ordineId,
  statoCorrente,
}: {
  ordineId: string
  statoCorrente: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  const transizione = TRANSIZIONI[statoCorrente]

  function avanzeStato() {
    if (!transizione) return
    startTransition(async () => {
      try {
        await avanzaStatoOrdine(ordineId, transizione.nuovoStato)
        router.refresh()
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  function handleElimina() {
    if (!confirm('Eliminare questo ordine?')) return
    startTransition(async () => {
      try {
        await eliminaOrdine(ordineId)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <div className="space-y-3">
      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      {transizione && (
        <button
          onClick={avanzeStato}
          disabled={pending}
          className={`w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50 ${transizione.color}`}
        >
          {pending ? 'Aggiornamento…' : transizione.label}
        </button>
      )}

      {statoCorrente === 'usato' && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
          <p className="text-blue-700 font-semibold">Ordine completato</p>
        </div>
      )}

      {statoCorrente === 'richiesto' && (
        <button
          onClick={handleElimina}
          disabled={pending}
          className="w-full rounded-xl border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Elimina ordine
        </button>
      )}
    </div>
  )
}
