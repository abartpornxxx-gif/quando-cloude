'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaClienteLibero } from './actions'

export function NuovoClienteLiberoForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [partitaIva, setPartitaIva] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErrore('Il nome è obbligatorio.'); return }
    setLoading(true)
    setErrore('')
    try {
      const id = await creaClienteLibero({ nome: nome.trim(), telefono, email, indirizzo, partitaIva, note })
      router.push(`/libero/clienti/${id}`)
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
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nome / Ragione sociale *</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
            placeholder="Mario Rossi"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Telefono</label>
            <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
              placeholder="+39 333 123 4567"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="mario@esempio.it"
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
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Partita IVA / C.F.</label>
          <input type="text" value={partitaIva} onChange={e => setPartitaIva(e.target.value)}
            placeholder="12345678901"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors resize-none" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio…' : 'Crea cliente'}
        </button>
      </form>
    </div>
  )
}
