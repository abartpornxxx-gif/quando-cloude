'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatEuro, centsToInput, euroToCents } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'

type Riga = { descrizione: string; quantita: number; prezzoUnitario: number }

type Cliente = { id: string; nome: string }

interface Props {
  action: (formData: FormData) => Promise<void>
  clienti: Cliente[]
  defaultValues?: {
    id?: string; clienteId?: string; data?: string; stato?: string
    note?: string; righe?: Riga[]
  }
}

export function PreventivoForm({ action, clienti, defaultValues }: Props) {
  const [righe, setRighe] = useState<Riga[]>(
    defaultValues?.righe ?? [{ descrizione: '', quantita: 1, prezzoUnitario: 0 }]
  )

  function aggiungiRiga() {
    setRighe(r => [...r, { descrizione: '', quantita: 1, prezzoUnitario: 0 }])
  }
  function rimuoviRiga(i: number) {
    setRighe(r => r.filter((_, idx) => idx !== i))
  }
  function aggiorna(i: number, field: keyof Riga, raw: string) {
    setRighe(r =>
      r.map((row, idx) =>
        idx !== i ? row : {
          ...row,
          [field]: field === 'descrizione' ? raw
            : field === 'quantita' ? parseFloat(raw) || 0
            : euroToCents(raw),
        }
      )
    )
  }

  const totale = calcolaTotalePreventivo(righe)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="righe" value={JSON.stringify(righe)} />
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      {/* Intestazione */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Cliente</label>
          <select name="clienteId" defaultValue={defaultValues?.clienteId ?? ''}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="">— Nessun cliente —</option>
            {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data preventivo</label>
          <input type="date" name="data" required
            defaultValue={defaultValues?.data ?? new Date().toISOString().slice(0, 10)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stato</label>
          <select name="stato" defaultValue={defaultValues?.stato ?? 'bozza'}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="bozza">Bozza</option>
            <option value="inviato">Inviato</option>
            <option value="accettato">Accettato</option>
            <option value="rifiutato">Rifiutato</option>
          </select>
        </div>
      </div>

      {/* Righe */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Voci del preventivo</h2>
          <button type="button" onClick={aggiungiRiga}
            className="text-sm font-medium text-blue-600 hover:text-blue-800">
            + Aggiungi voce
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Intestazione colonne */}
          <div className="hidden grid-cols-12 gap-2 bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid">
            <div className="col-span-6">Descrizione</div>
            <div className="col-span-2 text-right">Qtà</div>
            <div className="col-span-2 text-right">Prezzo unit. (€)</div>
            <div className="col-span-1 text-right">Totale</div>
            <div className="col-span-1" />
          </div>

          {righe.map((r, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2 px-4 py-2">
              <input
                value={r.descrizione}
                onChange={e => aggiorna(i, 'descrizione', e.target.value)}
                placeholder="Descrizione voce..."
                className="col-span-12 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none sm:col-span-6"
              />
              <input
                type="number" step="0.01" min="0"
                value={r.quantita}
                onChange={e => aggiorna(i, 'quantita', e.target.value)}
                className="col-span-4 rounded border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none sm:col-span-2"
              />
              <input
                type="number" step="0.01" min="0"
                value={centsToInput(r.prezzoUnitario)}
                onChange={e => aggiorna(i, 'prezzoUnitario', e.target.value)}
                className="col-span-4 rounded border border-gray-300 px-2 py-1.5 text-right text-sm focus:border-blue-500 focus:outline-none sm:col-span-2"
              />
              <div className="col-span-3 text-right text-sm font-medium text-gray-700 sm:col-span-1">
                {formatEuro(Math.round(r.quantita * r.prezzoUnitario))}
              </div>
              <button type="button" onClick={() => rimuoviRiga(i)}
                className="col-span-1 text-center text-sm text-red-400 hover:text-red-600">
                ✕
              </button>
            </div>
          ))}

          {righe.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Nessuna voce. Clicca "+ Aggiungi voce" per iniziare.
            </p>
          )}
        </div>

        {/* Totale */}
        <div className="flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-500">Totale preventivo:</span>
          <span className="text-xl font-bold text-gray-900">{formatEuro(totale)}</span>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">Note</label>
        <textarea name="note" rows={3} defaultValue={defaultValues?.note}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Salva preventivo
        </button>
        <Link href="/impresa/preventivi" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </Link>
      </div>
    </form>
  )
}
