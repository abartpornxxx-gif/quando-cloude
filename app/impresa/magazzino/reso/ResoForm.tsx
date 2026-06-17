'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registraReso } from '../../ordini/actions'

type Materiale = { id: string; codice: string | null; descrizione: string; unita: string | null }
type Commessa = { id: string; nome: string }

export default function ResoForm({
  materiali,
  commesse,
}: {
  materiali: Materiale[]
  commesse: Commessa[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)

  const [materialeId, setMaterialeId] = useState('')
  const [quantita, setQuantita] = useState('1')
  const [commessaId, setCommessaId] = useState('')
  const [note, setNote] = useState('')

  const materiale = materiali.find(m => m.id === materialeId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!materialeId) { setErrore('Seleziona un materiale'); return }
    const q = parseFloat(quantita)
    if (!q || q <= 0) { setErrore('Quantità non valida'); return }
    setErrore('')
    startTransition(async () => {
      try {
        await registraReso({
          materialeId,
          quantita: q,
          descrizione: `Reso: ${materiale?.descrizione ?? ''}`,
          commessaId: commessaId || undefined,
          note: note || undefined,
        })
        setSuccesso(true)
        setTimeout(() => router.push('/impresa/magazzino'), 1500)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  if (successo) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-8 text-center">
        <p className="text-green-700 font-semibold text-lg">Reso registrato!</p>
        <p className="text-green-600 text-sm mt-1">Reindirizzamento al magazzino…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Materiale *</label>
        <select
          value={materialeId}
          onChange={e => setMaterialeId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
        >
          <option value="">— Seleziona materiale —</option>
          {materiali.map(m => (
            <option key={m.id} value={m.id}>
              {m.codice ? `[${m.codice}] ` : ''}{m.descrizione}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Quantità {materiale?.unita ? `(${materiale.unita})` : ''} *
        </label>
        <input
          type="number"
          min="0.001"
          step="0.001"
          value={quantita}
          onChange={e => setQuantita(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Commessa di provenienza</label>
        <select
          value={commessaId}
          onChange={e => setCommessaId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">— Nessuna commessa —</option>
          {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Note</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Motivo del reso (opzionale)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      <div className="flex gap-3 pt-2">
        <a
          href="/impresa/magazzino"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annulla
        </a>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
        >
          {pending ? 'Salvataggio…' : 'Registra reso'}
        </button>
      </div>
    </form>
  )
}
