'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { creaOrdine } from '@/app/impresa/ordini/actions'
import { euroToCents, centsToInput } from '@/lib/format'

type Fornitore = { id: string; nome: string }
type Commessa = { id: string; nome: string }
type Materiale = { id: string; codice: string | null; descrizione: string; prezzo: number; unita: string | null }

interface Riga {
  materialeId: string
  descrizione: string
  quantita: string
  prezzoUnitario: string
}

function rigaVuota(): Riga {
  return { materialeId: '', descrizione: '', quantita: '1', prezzoUnitario: '0' }
}

export default function OrdineFormUfficio({
  fornitori, commesse, materiali,
}: {
  fornitori: Fornitore[]
  commesse: Commessa[]
  materiali: Materiale[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const [fornitoreId, setFornitoreId] = useState('')
  const [commessaId, setCommessaId] = useState('')
  const [note, setNote] = useState('')
  const [righe, setRighe] = useState<Riga[]>([rigaVuota()])

  function aggiungiRiga() { setRighe(prev => [...prev, rigaVuota()]) }
  function rimuoviRiga(idx: number) { setRighe(prev => prev.filter((_, i) => i !== idx)) }
  function aggiornaCampo(idx: number, campo: keyof Riga, valore: string) {
    setRighe(prev => prev.map((r, i) => i === idx ? { ...r, [campo]: valore } : r))
  }
  function selezionaMateriale(idx: number, matId: string) {
    const mat = materiali.find(m => m.id === matId)
    if (mat) {
      setRighe(prev => prev.map((r, i) =>
        i === idx ? { ...r, materialeId: matId, descrizione: mat.descrizione, prezzoUnitario: centsToInput(mat.prezzo) } : r
      ))
    } else {
      aggiornaCampo(idx, 'materialeId', '')
    }
  }

  const totale = righe.reduce((acc, r) => {
    const q = parseFloat(r.quantita) || 0
    const p = euroToCents(r.prezzoUnitario)
    return acc + q * p
  }, 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const righeValide = righe.filter(r => r.descrizione.trim())
    if (righeValide.length === 0) { setErrore('Aggiungi almeno una riga'); return }
    setErrore('')
    startTransition(async () => {
      try {
        const id = await creaOrdine({
          fornitoreId: fornitoreId || undefined,
          commessaId: commessaId || undefined,
          note: note || undefined,
          righe: righeValide.map(r => ({
            materialeId: r.materialeId || undefined,
            descrizione: r.descrizione,
            quantita: parseFloat(r.quantita) || 1,
            prezzoUnitario: euroToCents(r.prezzoUnitario),
          })),
        })
        router.push(`/ufficio/ordini/${id}`)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Intestazione ordine</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Fornitore</label>
            <select value={fornitoreId} onChange={e => setFornitoreId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
              <option value="">— Nessun fornitore —</option>
              {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Commessa destinazione</label>
            <select value={commessaId} onChange={e => setCommessaId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none">
              <option value="">— Nessuna commessa —</option>
              {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Note sull'ordine (opzionale)"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Righe ordine</h2>
          <button type="button" onClick={aggiungiRiga} className="text-sm text-teal-600 hover:text-teal-800 font-medium">+ Aggiungi riga</button>
        </div>
        <div className="space-y-3">
          {righe.map((r, idx) => (
            <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">Riga {idx + 1}</p>
                {righe.length > 1 && (
                  <button type="button" onClick={() => rimuoviRiga(idx)} className="text-xs text-red-500 hover:text-red-700">Rimuovi</button>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dal listino (opzionale)</label>
                <select value={r.materialeId} onChange={e => selezionaMateriale(idx, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none">
                  <option value="">— Scegli dal listino o scrivi libero —</option>
                  {materiali.map(m => (
                    <option key={m.id} value={m.id}>{m.codice ? `[${m.codice}] ` : ''}{m.descrizione} — {(m.prezzo / 100).toFixed(2)} €/{m.unita ?? 'pz'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Descrizione *</label>
                <input type="text" value={r.descrizione} onChange={e => aggiornaCampo(idx, 'descrizione', e.target.value)}
                  placeholder="Descrizione materiale"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quantità</label>
                  <input type="number" min="0.001" step="0.001" value={r.quantita} onChange={e => aggiornaCampo(idx, 'quantita', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prezzo unitario (€)</label>
                  <input type="number" min="0" step="0.01" value={r.prezzoUnitario} onChange={e => aggiornaCampo(idx, 'prezzoUnitario', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-3 text-right">
          <p className="text-sm text-gray-500">Totale ordine:</p>
          <p className="text-xl font-bold text-gray-900">{(totale / 100).toFixed(2)} €</p>
        </div>
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}
      <div className="flex gap-3">
        <a href="/ufficio/ordini" className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</a>
        <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          {pending ? 'Creazione…' : 'Crea ordine'}
        </button>
      </div>
    </form>
  )
}
