'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaProfiloLibero } from './actions'

interface Props {
  nomeDefault: string
  emailDefault: string
  authUserId: string
}

export function ConfiguraLiberoForm({ nomeDefault, emailDefault, authUserId }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(nomeDefault)
  const [email, setEmail] = useState(emailDefault)
  const [telefono, setTelefono] = useState('')
  const [partitaIva, setPartitaIva] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErrore('Il nome è obbligatorio.'); return }
    setLoading(true)
    setErrore('')
    try {
      await creaProfiloLibero({ nome: nome.trim(), email: email.trim(), telefono, partitaIva, authUserId })
      router.push('/libero/dashboard')
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
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nome e cognome *</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors"
            placeholder="Mario Rossi" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors"
            placeholder="mario@esempio.it" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Telefono</label>
          <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors"
            placeholder="+39 333 123 4567" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Partita IVA</label>
          <input type="text" value={partitaIva} onChange={e => setPartitaIva(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors"
            placeholder="12345678901" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio…' : 'Inizia a usare QUADRO'}
        </button>
      </form>
    </div>
  )
}
