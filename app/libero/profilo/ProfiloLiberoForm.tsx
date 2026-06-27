'use client'

import { useState } from 'react'
import { aggiornaProfilo } from './actions'

interface Props {
  libero: {
    id: string
    nome: string
    partitaIva: string
    indirizzo: string
    email: string
    telefono: string
    note: string
  }
}

export function ProfiloLiberoForm({ libero }: Props) {
  const [nome, setNome] = useState(libero.nome)
  const [partitaIva, setPartitaIva] = useState(libero.partitaIva)
  const [indirizzo, setIndirizzo] = useState(libero.indirizzo)
  const [email, setEmail] = useState(libero.email)
  const [telefono, setTelefono] = useState(libero.telefono)
  const [note, setNote] = useState(libero.note)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      await aggiornaProfilo({ id: libero.id, nome, partitaIva, indirizzo, email, telefono, note })
      setMsg({ type: 'ok', text: 'Profilo aggiornato con successo.' })
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
      {msg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-medium mb-4 border ${msg.type === 'ok' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {msg.text}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nome e cognome / Ragione sociale *</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Partita IVA</label>
            <input type="text" value={partitaIva} onChange={e => setPartitaIva(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Telefono</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Indirizzo</label>
          <input type="text" value={indirizzo} onChange={e => setIndirizzo(e.target.value)}
            placeholder="Via Roma 1, 20100 Milano (MI)"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Note (appaiono sui preventivi PDF)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Iscritto albo CCIAA… Abilitazione DM 37/2008…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors resize-none" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio…' : 'Salva profilo'}
        </button>
      </form>
    </div>
  )
}
