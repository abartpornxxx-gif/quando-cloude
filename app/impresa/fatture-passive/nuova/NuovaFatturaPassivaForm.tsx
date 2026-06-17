'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { creaFatturaPassiva } from '../actions'
import { euroToCents } from '@/lib/format'

type Fornitore = { id: string; nome: string }
type Commessa = { id: string; nome: string }
type Ordine = { id: string; fornitore: { nome: string } | null; createdAt: Date | string }

export default function NuovaFatturaPassivaForm({
  fornitori,
  commesse,
  ordini,
}: {
  fornitori: Fornitore[]
  commesse: Commessa[]
  ordini: Ordine[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  const oggi = new Date().toISOString().slice(0, 10)
  const [fornitoreId, setFornitoreId] = useState('')
  const [commessaId, setCommessaId] = useState('')
  const [ordineId, setOrdineId] = useState('')
  const [numero, setNumero] = useState('')
  const [data, setData] = useState(oggi)
  const [dataScadenza, setDataScadenza] = useState('')
  const [importo, setImporto] = useState('')
  const [note, setNote] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = euroToCents(importo)
    if (cents <= 0) { setErrore('Inserisci un importo valido'); return }
    setErrore('')
    startTransition(async () => {
      try {
        const id = await creaFatturaPassiva({
          fornitoreId: fornitoreId || undefined,
          commessaId: commessaId || undefined,
          ordineId: ordineId || undefined,
          numero: numero || undefined,
          data,
          dataScadenza: dataScadenza || undefined,
          importo: cents,
          note: note || undefined,
        })
        router.push(`/impresa/fatture-passive/${id}`)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Dati fattura fornitore</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Fornitore</label>
            <select
              value={fornitoreId}
              onChange={e => setFornitoreId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Nessun fornitore —</option>
              {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Numero fattura fornitore</label>
            <input
              type="text"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              placeholder="Numero fattura del fornitore"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data fattura *</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scadenza pagamento</label>
            <input
              type="date"
              value={dataScadenza}
              onChange={e => setDataScadenza(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Importo totale (€ con IVA) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={importo}
            onChange={e => setImporto(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Commessa collegata</label>
            <select
              value={commessaId}
              onChange={e => setCommessaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Nessuna —</option>
              {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ordine materiale collegato</label>
            <select
              value={ordineId}
              onChange={e => setOrdineId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Nessun ordine —</option>
              {ordini.map(o => (
                <option key={o.id} value={o.id}>
                  {o.fornitore?.nome ?? 'Ordine'} — {new Date(o.createdAt).toLocaleDateString('it-IT')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      <div className="flex gap-3">
        <a href="/impresa/fatture-passive" className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </a>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Salvataggio…' : 'Registra fattura'}
        </button>
      </div>
    </form>
  )
}
