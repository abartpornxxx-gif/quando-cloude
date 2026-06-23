'use client'

import { useState, useTransition } from 'react'
import { creaPianificazioneConStima } from './actions'

interface Props {
  operaioId: string
  operaioNome: string
  commessaId: string
  commessaNome: string
  lavoroDaFare: string
  stimaOreDomani: number | null
  data: string
  commesse: { id: string; nome: string }[]
}

export function ConfermaButton({
  operaioId, operaioNome, commessaId, commessaNome, lavoroDaFare, stimaOreDomani, data, commesse,
}: Props) {
  const [aperta, setAperta] = useState(false)
  const [commessaSelezionata, setCommessaSelezionata] = useState(commessaId)
  const [lavoroNota, setLavoroNota] = useState(lavoroDaFare)
  const [stimaImpresa, setStimaImpresa] = useState(stimaOreDomani?.toString() ?? '')
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [errore, setErrore] = useState('')

  function conferma() {
    setErrore('')
    startTransition(async () => {
      try {
        await creaPianificazioneConStima({
          operaioId,
          commessaId: commessaSelezionata,
          data,
          lavoroDaFare: lavoroNota.trim() || undefined,
          stimaImpresaOre: stimaImpresa ? parseFloat(stimaImpresa) : undefined,
        })
        setDone(true)
        setAperta(false)
      } catch (e: unknown) {
        setErrore(e instanceof Error ? e.message : 'Errore durante la pianificazione')
      }
    })
  }

  if (done) {
    return (
      <p className="text-xs text-emerald-600 font-semibold">✓ Giornata confermata per {operaioNome}</p>
    )
  }

  if (!aperta) {
    return (
      <button
        onClick={() => setAperta(true)}
        className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        + Pianifica questa giornata
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-blue-900">Conferma giornata per {operaioNome}</p>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Cantiere</label>
        <select
          value={commessaSelezionata}
          onChange={e => setCommessaSelezionata(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          {commesse.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Lavoro da fare</label>
        <textarea
          value={lavoroNota}
          onChange={e => setLavoroNota(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
          rows={2}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">
          Stima ore (impresa){stimaOreDomani ? ` — operaio ha detto ${stimaOreDomani}h` : ''}
        </label>
        <input
          type="number"
          min="1"
          max="12"
          step="0.5"
          value={stimaImpresa}
          onChange={e => setStimaImpresa(e.target.value)}
          placeholder="es. 8"
          className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
        />
      </div>

      {errore && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-medium text-red-700">{errore}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={conferma}
          disabled={pending}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {pending ? '…' : 'Conferma giornata'}
        </button>
        <button
          onClick={() => { setAperta(false); setErrore('') }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
      </div>
    </div>
  )
}
