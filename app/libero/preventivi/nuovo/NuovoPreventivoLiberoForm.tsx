'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaPreventivoLibero } from './actions'
import { Plus, Trash2 } from 'lucide-react'

interface Riga {
  descrizione: string
  quantita: string
  prezzoUnitario: string
}

interface Props {
  clienti: { id: string; nome: string }[]
}

export function NuovoPreventivoLiberoForm({ clienti }: Props) {
  const router = useRouter()
  const [clienteId, setClienteId] = useState('')
  const [note, setNote] = useState('')
  const [righe, setRighe] = useState<Riga[]>([{ descrizione: '', quantita: '1', prezzoUnitario: '' }])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  function aggiungiRiga() {
    setRighe(r => [...r, { descrizione: '', quantita: '1', prezzoUnitario: '' }])
  }

  function rimuoviRiga(i: number) {
    setRighe(r => r.filter((_, idx) => idx !== i))
  }

  function aggiornaRiga(i: number, campo: keyof Riga, valore: string) {
    setRighe(r => r.map((riga, idx) => idx === i ? { ...riga, [campo]: valore } : riga))
  }

  const totale = righe.reduce((s, r) => {
    const q = parseFloat(r.quantita) || 0
    const p = parseFloat(r.prezzoUnitario) || 0
    return s + q * p
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (righe.some(r => !r.descrizione.trim())) {
      setErrore('Compila la descrizione di tutte le righe.')
      return
    }
    setLoading(true)
    setErrore('')
    try {
      const id = await creaPreventivoLibero({
        clienteId: clienteId || undefined,
        note,
        righe: righe.map(r => ({
          descrizione: r.descrizione.trim(),
          quantita: parseFloat(r.quantita) || 1,
          prezzoUnitario: Math.round((parseFloat(r.prezzoUnitario) || 0) * 100),
        })),
      })
      router.push(`/libero/preventivi/${id}`)
    } catch (err: any) {
      setErrore(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6 space-y-6">
      {errore && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800">{errore}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Cliente</label>
          <select value={clienteId} onChange={e => setClienteId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors">
            <option value="">— Nessun cliente —</option>
            {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voci preventivo</p>
            <button type="button" onClick={aggiungiRiga}
              className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors">
              <Plus size={13} /> Aggiungi voce
            </button>
          </div>
          <div className="space-y-3">
            {righe.map((riga, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 sm:col-span-7">
                  <input type="text" value={riga.descrizione}
                    onChange={e => aggiornaRiga(i, 'descrizione', e.target.value)}
                    placeholder="Descrizione voce"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <input type="number" min="0.01" step="0.01" value={riga.quantita}
                    onChange={e => aggiornaRiga(i, 'quantita', e.target.value)}
                    placeholder="Q.tà"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <input type="number" min="0" step="0.01" value={riga.prezzoUnitario}
                    onChange={e => aggiornaRiga(i, 'prezzoUnitario', e.target.value)}
                    placeholder="€/cad"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors" />
                </div>
                <div className="col-span-1">
                  {righe.length > 1 && (
                    <button type="button" onClick={() => rimuoviRiga(i)}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Totale imponibile</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(totale)}
              </p>
              <p className="text-xs text-gray-400">(IVA da applicare in fattura)</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Note / Condizioni</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Validità preventivo 30 giorni. Pagamento a 30gg dalla fattura…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white transition-colors resize-none" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors">
          {loading ? 'Salvataggio…' : 'Crea preventivo'}
        </button>
      </form>
    </div>
  )
}
