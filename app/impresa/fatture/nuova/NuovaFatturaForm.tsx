'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { creaFatturaAttiva } from '../actions'
import { euroToCents, centsToInput } from '@/lib/format'

type Cliente = { id: string; nome: string }
type Commessa = { id: string; nome: string }

interface Riga {
  descrizione: string
  quantita: string
  prezzoUnitario: string
}

function rigaVuota(): Riga {
  return { descrizione: '', quantita: '1', prezzoUnitario: '0' }
}

export default function NuovaFatturaForm({
  clienti,
  commesse,
}: {
  clienti: Cliente[]
  commesse: Commessa[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  const oggi = new Date().toISOString().slice(0, 10)
  const annoCorrente = new Date().getFullYear()

  const [numero, setNumero] = useState('')
  const [anno, setAnno] = useState(String(annoCorrente))
  const [data, setData] = useState(oggi)
  const [dataScadenza, setDataScadenza] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [commessaId, setCommessaId] = useState('')
  const [aliquotaIva, setAliquotaIva] = useState('22')
  const [note, setNote] = useState('')
  const [righe, setRighe] = useState<Riga[]>([rigaVuota()])

  function aggiungiRiga() {
    setRighe(prev => [...prev, rigaVuota()])
  }
  function rimuoviRiga(idx: number) {
    setRighe(prev => prev.filter((_, i) => i !== idx))
  }
  function aggiornaCampo(idx: number, campo: keyof Riga, valore: string) {
    setRighe(prev => prev.map((r, i) => i === idx ? { ...r, [campo]: valore } : r))
  }

  const imponibile = righe.reduce((acc, r) => {
    return acc + (parseFloat(r.quantita) || 0) * euroToCents(r.prezzoUnitario)
  }, 0)
  const iva = Math.round(imponibile * (parseInt(aliquotaIva) || 22) / 100)
  const totale = imponibile + iva

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const righeValide = righe.filter(r => r.descrizione.trim())
    if (!numero.trim()) { setErrore('Inserisci il numero fattura'); return }
    if (righeValide.length === 0) { setErrore('Aggiungi almeno una riga'); return }
    setErrore('')
    startTransition(async () => {
      try {
        const id = await creaFatturaAttiva({
          numero,
          anno: parseInt(anno) || annoCorrente,
          data,
          dataScadenza: dataScadenza || undefined,
          clienteId: clienteId || undefined,
          commessaId: commessaId || undefined,
          aliquotaIva: parseInt(aliquotaIva) || 22,
          note: note || undefined,
          righe: righeValide.map(r => ({
            descrizione: r.descrizione,
            quantita: parseFloat(r.quantita) || 1,
            prezzoUnitario: euroToCents(r.prezzoUnitario),
          })),
        })
        router.push(`/impresa/fatture/${id}`)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Dati fattura</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Numero *</label>
            <input
              type="text"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              placeholder="es. 001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Anno *</label>
            <input
              type="number"
              value={anno}
              onChange={e => setAnno(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data emissione *</label>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <select
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Nessun cliente —</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Commessa collegata</label>
            <select
              value={commessaId}
              onChange={e => setCommessaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Nessuna commessa —</option>
              {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Aliquota IVA (%)</label>
            <select
              value={aliquotaIva}
              onChange={e => setAliquotaIva(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="22">22%</option>
              <option value="10">10%</option>
              <option value="4">4%</option>
              <option value="0">0% (esente)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Note (opzionale)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Voci fattura</h2>
          <button type="button" onClick={aggiungiRiga} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            + Aggiungi voce
          </button>
        </div>

        <div className="space-y-3">
          {righe.map((r, idx) => (
            <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">Voce {idx + 1}</p>
                {righe.length > 1 && (
                  <button type="button" onClick={() => rimuoviRiga(idx)} className="text-xs text-red-500 hover:text-red-700">
                    Rimuovi
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Descrizione *</label>
                <input
                  type="text"
                  value={r.descrizione}
                  onChange={e => aggiornaCampo(idx, 'descrizione', e.target.value)}
                  placeholder="Descrizione prestazione/materiale"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quantità</label>
                  <input
                    type="number" min="0.001" step="0.001"
                    value={r.quantita}
                    onChange={e => aggiornaCampo(idx, 'quantita', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prezzo unitario (€)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={r.prezzoUnitario}
                    onChange={e => aggiornaCampo(idx, 'prezzoUnitario', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-1 text-right">
          <p className="text-sm text-gray-500">Imponibile: <span className="font-semibold">{(imponibile / 100).toFixed(2)} €</span></p>
          <p className="text-sm text-gray-500">IVA {aliquotaIva}%: <span className="font-semibold">{(iva / 100).toFixed(2)} €</span></p>
          <p className="text-base font-bold text-gray-900">Totale: {(totale / 100).toFixed(2)} €</p>
        </div>
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      <div className="flex gap-3">
        <a href="/impresa/fatture" className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </a>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Creazione…' : 'Crea fattura'}
        </button>
      </div>
    </form>
  )
}
