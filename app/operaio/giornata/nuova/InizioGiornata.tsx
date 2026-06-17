'use client'

import { useState, useTransition } from 'react'
import { iniziaGiornata } from './actions'

type Commessa = { id: string; nome: string; indirizzoCantiere?: string | null }
type Mezzo = { id: string; nome: string; targa?: string | null }
type Attrezzatura = {
  id: string
  nome: string
  stato: string
  assegnatario?: string | null
}
type Pianificazione = {
  id: string
  commessa: Commessa
  mezzo: Mezzo | null
  lavoroDaFare: string | null
  noteMateriale: string | null
  note: string | null
}

interface Props {
  commesse: Commessa[]
  mezzi: Mezzo[]
  attrezzature: Attrezzatura[]
  pianificazione: Pianificazione | null
}

export default function InizioGiornata({ commesse, mezzi, attrezzature, pianificazione }: Props) {
  const [commessaId, setCommessaId] = useState(pianificazione?.commessa.id ?? '')
  const [mezzoId, setMezzoId] = useState(pianificazione?.mezzo?.id ?? '')
  const [attrezzatureSelezionate, setAttrezzatureSelezionate] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  function toggleAttrezzatura(id: string, bloccata: boolean) {
    if (bloccata) return
    setAttrezzatureSelezionate(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commessaId) { setErrore('Seleziona una commessa'); return }
    setErrore('')
    startTransition(async () => {
      try {
        await iniziaGiornata({
          commessaId,
          mezzoId: mezzoId || undefined,
          pianificazioneId: pianificazione?.id,
          attrezzatureIds: attrezzatureSelezionate,
        })
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore imprevisto')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-5 max-w-xl mx-auto">

      {/* ORDINE 1: Indicazioni impresa (sola lettura) */}
      {pianificazione && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Piano dell&apos;impresa per oggi</p>
          <p className="font-semibold text-gray-800">{pianificazione.commessa.nome}</p>
          {pianificazione.commessa.indirizzoCantiere && (
            <p className="text-sm text-gray-600">📍 {pianificazione.commessa.indirizzoCantiere}</p>
          )}
          {pianificazione.mezzo && (
            <p className="text-sm text-gray-600">🚗 Mezzo: {pianificazione.mezzo.nome} {pianificazione.mezzo.targa ? `(${pianificazione.mezzo.targa})` : ''}</p>
          )}
          {pianificazione.lavoroDaFare && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">Lavoro da fare:</p>
              <p className="text-sm text-gray-800 bg-white rounded p-2 border">{pianificazione.lavoroDaFare}</p>
            </div>
          )}
          {pianificazione.noteMateriale && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">Note materiale:</p>
              <p className="text-sm text-gray-800 bg-white rounded p-2 border">{pianificazione.noteMateriale}</p>
            </div>
          )}
          {pianificazione.note && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">Note aggiuntive:</p>
              <p className="text-sm text-gray-700">{pianificazione.note}</p>
            </div>
          )}
        </div>
      )}

      {/* Commessa */}
      <div>
        <label className="block text-sm font-semibold mb-1">Commessa *</label>
        {pianificazione ? (
          <p className="text-gray-700 font-medium py-2">{pianificazione.commessa.nome} <span className="text-xs text-gray-400">(pre-assegnata)</span></p>
        ) : (
          <select
            value={commessaId}
            onChange={e => setCommessaId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          >
            <option value="">— Seleziona commessa —</option>
            {commesse.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* Mezzo */}
      <div>
        <label className="block text-sm font-semibold mb-1">Mezzo (opzionale)</label>
        {pianificazione?.mezzo ? (
          <p className="text-gray-700 py-2">{pianificazione.mezzo.nome} <span className="text-xs text-gray-400">(pre-assegnato)</span></p>
        ) : (
          <select
            value={mezzoId}
            onChange={e => setMezzoId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— Nessun mezzo —</option>
            {mezzi.map(m => (
              <option key={m.id} value={m.id}>{m.nome} {m.targa ? `(${m.targa})` : ''}</option>
            ))}
          </select>
        )}
      </div>

      {/* ORDINE 2: Lista attrezzatura con blocco condivisione */}
      <div>
        <label className="block text-sm font-semibold mb-2">Attrezzatura che porti con te</label>
        {attrezzature.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna attrezzatura disponibile</p>
        ) : (
          <div className="space-y-2">
            {attrezzature.map(a => {
              const bloccata = a.stato === 'in_uso'
              const selezionata = attrezzatureSelezionate.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAttrezzatura(a.id, bloccata)}
                  disabled={bloccata}
                  className={[
                    'w-full text-left px-4 py-3 rounded-xl border transition-all',
                    bloccata
                      ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                      : selezionata
                      ? 'bg-green-50 border-green-400'
                      : 'bg-white border-gray-300 hover:border-gray-400',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{a.nome}</span>
                    {bloccata ? (
                      <span className="text-xs text-red-500">🔒 {a.assegnatario ? `usato da ${a.assegnatario}` : 'in uso'}</span>
                    ) : selezionata ? (
                      <span className="text-xs text-green-600">✓ Preso</span>
                    ) : (
                      <span className="text-xs text-gray-400">Disponibile</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50"
      >
        {pending ? 'Avvio in corso…' : '▶ Inizia giornata'}
      </button>
    </form>
  )
}
