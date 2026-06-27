'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaAppuntamento } from './actions'

export function NuovoAppuntamentoForm() {
  const router = useRouter()
  const [titolo, setTitolo] = useState('')
  const [dataOra, setDataOra] = useState('')
  const [luogo, setLuogo] = useState('')
  const [tipo, setTipo] = useState('intervento')
  const [descrizione, setDescrizione] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titolo.trim() || !dataOra) { setErrore('Titolo e data/ora sono obbligatori.'); return }
    setLoading(true)
    setErrore('')
    try {
      await creaAppuntamento({ titolo: titolo.trim(), dataOra, luogo, tipo, descrizione })
      router.push('/libero/appuntamenti')
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
            placeholder="Es. Sopralluogo Rossi"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Data e ora *</label>
            <input type="datetime-local" value={dataOra} onChange={e => setDataOra(e.target.value)} required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors">
              <option value="sopralluogo">Sopralluogo</option>
              <option value="intervento">Intervento</option>
              <option value="riunione">Riunione</option>
              <option value="scadenza">Scadenza</option>
              <option value="altro">Altro</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Luogo</label>
          <input type="text" value={luogo} onChange={e => setLuogo(e.target.value)}
            placeholder="Via Roma 1, Milano"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Note</label>
          <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} rows={2}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors resize-none" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio…' : 'Crea appuntamento'}
        </button>
      </form>
    </div>
  )
}
