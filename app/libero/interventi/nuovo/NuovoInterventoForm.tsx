'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaIntervento } from './actions'

interface Props {
  liberoId: string
  clienti: { id: string; nome: string }[]
}

export function NuovoInterventoForm({ liberoId, clienti }: Props) {
  const router = useRouter()
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [data, setData] = useState('')
  const [stato, setStato] = useState('pianificato')
  const [importo, setImporto] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titolo.trim()) { setErrore('Il titolo è obbligatorio.'); return }
    setLoading(true)
    setErrore('')
    try {
      const id = await creaIntervento({
        liberoId, titolo: titolo.trim(), descrizione, indirizzo,
        clienteId: clienteId || undefined,
        dataIntervento: data || undefined,
        stato,
        importo: importo ? Math.round(parseFloat(importo) * 100) : 0,
      })
      router.push(`/libero/interventi/${id}`)
    } catch (err: any) {
      setErrore(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
      {errore && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800 mb-4">{errore}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Titolo *</label>
          <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)} required
            placeholder="Es. Sostituzione impianto luce cucina"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Cliente</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors">
              <option value="">— Nessun cliente —</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Stato</label>
            <select value={stato} onChange={e => setStato(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors">
              <option value="pianificato">Pianificato</option>
              <option value="in_corso">In corso</option>
              <option value="completato">Completato</option>
              <option value="annullato">Annullato</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Data intervento</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Importo (€)</label>
            <input type="number" min="0" step="0.01" value={importo} onChange={e => setImporto(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Indirizzo</label>
          <input type="text" value={indirizzo} onChange={e => setIndirizzo(e.target.value)}
            placeholder="Via Roma 1, Milano"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Descrizione</label>
          <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={3}
            placeholder="Descrivi i lavori da svolgere…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors resize-none" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio…' : 'Crea intervento'}
        </button>
      </form>
    </div>
  )
}
