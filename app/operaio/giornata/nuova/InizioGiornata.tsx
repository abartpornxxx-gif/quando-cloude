'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
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

  // Dettagli aggiuntivi (mezzo e attrezzatura) — collapsed se c'è pianificazione
  const [dettagliAperti, setDettagliAperti] = useState(!pianificazione)

  function toggleAttrezzatura(id: string, bloccata: boolean) {
    if (bloccata) return
    setAttrezzatureSelezionate(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id],
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
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Piano dell'impresa */}
      {pianificazione ? (
        <div className="rounded-2xl bg-emerald-900 text-white p-5 space-y-3">
          <p className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
            Piano dell&apos;impresa per oggi
          </p>
          <div>
            <p className="text-xl font-bold leading-tight">{pianificazione.commessa.nome}</p>
            {pianificazione.commessa.indirizzoCantiere && (
              <p className="text-sm text-emerald-200 mt-1 flex items-center gap-1">
                <Image src="/immagini/icona-posizione.png" width={12} height={12} alt="" className="shrink-0 brightness-0 invert opacity-80" />
                {pianificazione.commessa.indirizzoCantiere}
              </p>
            )}
            {pianificazione.mezzo && (
              <p className="text-sm text-emerald-200 mt-0.5">
                🚗 {pianificazione.mezzo.nome}
                {pianificazione.mezzo.targa ? ` (${pianificazione.mezzo.targa})` : ''}
              </p>
            )}
          </div>
          {pianificazione.lavoroDaFare && (
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-300 mb-1">Lavoro da fare</p>
              <p className="text-sm text-white">{pianificazione.lavoroDaFare}</p>
            </div>
          )}
          {pianificazione.noteMateriale && (
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-300 mb-1">Note materiale</p>
              <p className="text-sm text-white">{pianificazione.noteMateriale}</p>
            </div>
          )}
        </div>
      ) : (
        /* Senza pianificazione: seleziona commessa */
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Cantiere *
          </label>
          <select
            value={commessaId}
            onChange={e => setCommessaId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          >
            <option value="">— Seleziona cantiere —</option>
            {commesse.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome}{c.indirizzoCantiere ? ` — ${c.indirizzoCantiere}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Dettagli aggiuntivi (collapsibili) */}
      {(mezzi.length > 0 || attrezzature.length > 0) && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setDettagliAperti(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
          >
            <p className="text-sm font-semibold text-gray-700">
              ⚙ Mezzo e attrezzatura
              {attrezzatureSelezionate.length > 0 && (
                <span className="ml-2 text-xs text-emerald-600 font-normal">
                  {attrezzatureSelezionate.length} selezionat{attrezzatureSelezionate.length === 1 ? 'a' : 'e'}
                </span>
              )}
              {mezzoId && !dettagliAperti && mezzi.find(m => m.id === mezzoId) && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {mezzi.find(m => m.id === mezzoId)?.nome}
                </span>
              )}
            </p>
            <span className="text-gray-400 text-sm">{dettagliAperti ? '▲' : '▼'}</span>
          </button>

          {dettagliAperti && (
            <div className="border-t border-gray-100 p-5 space-y-5">
              {/* Mezzo */}
              {mezzi.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mezzo <span className="text-gray-400 font-normal">(opzionale)</span>
                  </label>
                  {pianificazione?.mezzo ? (
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5">
                      <p className="font-medium text-gray-900 text-sm">
                        {pianificazione.mezzo.nome}
                        {pianificazione.mezzo.targa ? ` (${pianificazione.mezzo.targa})` : ''}
                      </p>
                      <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Pre-assegnato</span>
                    </div>
                  ) : (
                    <select
                      value={mezzoId}
                      onChange={e => setMezzoId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">— Nessun mezzo —</option>
                      {mezzi.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nome}{m.targa ? ` (${m.targa})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Attrezzatura */}
              {attrezzature.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Attrezzatura che porti con te
                  </p>
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
                            'w-full text-left px-4 py-3 rounded-xl border-2 transition-all',
                            bloccata
                              ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                              : selezionata
                              ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                              : 'bg-white border-gray-200 hover:border-gray-300',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-medium text-sm ${bloccata ? 'text-gray-400' : 'text-gray-900'}`}>
                              {a.nome}
                            </span>
                            {bloccata ? (
                              <span className="text-xs text-red-500 font-medium">
                                🔒 {a.assegnatario ? `Usato da ${a.assegnatario}` : 'In uso'}
                              </span>
                            ) : selezionata ? (
                              <span className="text-xs text-emerald-600 font-semibold">✓ Preso</span>
                            ) : (
                              <span className="text-xs text-gray-400">Disponibile</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {errore && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-red-700 text-sm font-medium">{errore}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-emerald-600 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
      >
        {pending ? 'Avvio in corso…' : '▶ Inizia giornata'}
      </button>
    </form>
  )
}
