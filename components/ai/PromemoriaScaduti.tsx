'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, Check, Clock, RotateCcw, ChevronDown, ChevronUp, MapPin, Sparkles } from 'lucide-react'
import { completaPromemoria, rimandaPromemoria, registraEsito } from '@/app/ufficio/promemoria/actions'

type Promemoria = {
  id: string; titolo: string; tipo: string; dataOra: Date; luogo?: string | null
  cliente?: { nome: string } | null; commessa?: { nome: string } | null
}

interface Props {
  scaduti: Promemoria[]
  onAggiornato: () => void
  accentColor?: string
}

const RIMANDA_OPZIONI = [
  { label: 'Tra 1 ora',         ore: 1 },
  { label: 'Domani mattina',    ore: 18 },
  { label: 'Domani pomeriggio', ore: 22 },
  { label: 'Prossima settimana', ore: 168 },
]

export function PromemoriaScaduti({ scaduti, onAggiornato, accentColor = 'blue' }: Props) {
  const [aperto, setAperto] = useState(true)
  const [pendingId, startTransition] = useTransition()
  const [esitoId, setEsitoId] = useState<string | null>(null)
  const [esitoTesto, setEsitoTesto] = useState('')
  const [aiTesto, setAiTesto] = useState<Record<string, string>>({})
  const [loadingAiId, setLoadingAiId] = useState<string | null>(null)
  const [rimandaId, setRimandaId] = useState<string | null>(null)
  const [rimandaData, setRimandaData] = useState('')
  const [rimandaOra, setRimandaOra] = useState('')

  if (scaduti.length === 0) return null

  async function handleCaricaAI(p: Promemoria) {
    if (aiTesto[p.id]) { setEsitoId(p.id); return }
    setLoadingAiId(p.id)
    try {
      const res = await fetch('/api/ai/promemoria/esito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titolo: p.titolo, tipo: p.tipo, dataOra: p.dataOra }),
      })
      const data = await res.json()
      setAiTesto(prev => ({ ...prev, [p.id]: data.testo || `Il promemoria "${p.titolo}" è scaduto. Cosa è successo?` }))
    } catch {
      setAiTesto(prev => ({ ...prev, [p.id]: `Il promemoria "${p.titolo}" è scaduto. Hai completato questa attività?` }))
    } finally {
      setLoadingAiId(null)
      setEsitoId(p.id)
    }
  }

  function handleFatto(id: string) {
    startTransition(async () => {
      await completaPromemoria(id, true)
      onAggiornato()
    })
  }

  function handleRegistraEsito(id: string) {
    if (!esitoTesto.trim()) return
    startTransition(async () => {
      await registraEsito(id, esitoTesto, false)
      setEsitoId(null)
      setEsitoTesto('')
      onAggiornato()
    })
  }

  function apriRimanda(id: string, dataOraOriginale: Date) {
    const now = new Date(dataOraOriginale.getTime() + 24 * 3600 * 1000)
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    const [d, t] = local.toISOString().slice(0, 16).split('T')
    setRimandaData(d)
    setRimandaOra(t)
    setRimandaId(id)
  }

  function handleRimandaOpzione(id: string, ore: number) {
    startTransition(async () => {
      const nuova = new Date(Date.now() + ore * 3600 * 1000)
      await rimandaPromemoria(id, nuova.toISOString())
      setRimandaId(null)
      onAggiornato()
    })
  }

  function handleRimandaManuale(id: string) {
    if (!rimandaData || !rimandaOra) return
    startTransition(async () => {
      const dataOraLocal = `${rimandaData}T${rimandaOra}`
      const dataOraUTC = new Date(dataOraLocal).toISOString()
      await rimandaPromemoria(id, dataOraUTC)
      setRimandaId(null)
      onAggiornato()
    })
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 shadow-sm overflow-hidden mb-5">
      <button
        onClick={() => setAperto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 shrink-0">
          <AlertCircle size={16} className="text-orange-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-orange-900">
            {scaduti.length === 1 ? '1 promemoria da verificare' : `${scaduti.length} promemoria da verificare`}
          </p>
          <p className="text-[11px] text-orange-600">Attività scadute che richiedono un esito</p>
        </div>
        {aperto ? <ChevronUp size={16} className="text-orange-400" /> : <ChevronDown size={16} className="text-orange-400" />}
      </button>

      {aperto && (
        <div className="border-t border-orange-100 divide-y divide-orange-100">
          {scaduti.map(p => {
            const oraFormattata = new Date(p.dataOra).toLocaleString('it-IT', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
            })
            return (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{p.titolo}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md font-medium">
                        <Clock size={10} />{oraFormattata}
                      </span>
                      {p.luogo && <span className="flex items-center gap-1 text-[11px] text-gray-500"><MapPin size={10} />{p.luogo}</span>}
                      {p.cliente && <span className="text-[11px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{p.cliente.nome}</span>}
                      {p.commessa && <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{p.commessa.nome}</span>}
                    </div>
                  </div>
                </div>

                {/* AI esito */}
                {esitoId === p.id && aiTesto[p.id] && (
                  <div className="mt-3 rounded-xl bg-white border border-orange-200 px-3 py-2.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <Sparkles size={13} className="text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700">{aiTesto[p.id]}</p>
                    </div>
                    <textarea
                      value={esitoTesto}
                      onChange={e => setEsitoTesto(e.target.value)}
                      rows={2}
                      placeholder="Cosa è successo? Aggiungi una nota…"
                      className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-orange-400/30 resize-none"
                    />
                    <button
                      onClick={() => handleRegistraEsito(p.id)}
                      disabled={!esitoTesto.trim()}
                      className="w-full py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Salva esito e chiudi
                    </button>
                    <button onClick={() => setEsitoId(null)} className="w-full text-[11px] text-gray-400 hover:text-gray-600 text-center">
                      Annulla
                    </button>
                  </div>
                )}

                {/* Rimanda — selettore */}
                {rimandaId === p.id && (
                  <div className="mt-3 rounded-xl bg-white border border-blue-200 px-3 py-2.5 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quando rimandare?</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {RIMANDA_OPZIONI.map(op => (
                        <button key={op.label} onClick={() => handleRimandaOpzione(p.id, op.ore)}
                          className="py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium transition-colors">
                          {op.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <input type="date" value={rimandaData} onChange={e => setRimandaData(e.target.value)}
                        className="flex-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none" />
                      <input type="time" value={rimandaOra} onChange={e => setRimandaOra(e.target.value)}
                        className="flex-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none" />
                    </div>
                    <button onClick={() => handleRimandaManuale(p.id)} disabled={!rimandaData || !rimandaOra}
                      className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50">
                      Rimanda a questa data
                    </button>
                    <button onClick={() => setRimandaId(null)} className="w-full text-[11px] text-gray-400 hover:text-gray-600 text-center">Annulla</button>
                  </div>
                )}

                {/* Azioni rapide (solo se non c'è pannello aperto) */}
                {esitoId !== p.id && rimandaId !== p.id && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <button onClick={() => handleFatto(p.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors">
                      <Check size={11} /> Fatto
                    </button>
                    <button onClick={() => apriRimanda(p.id, new Date(p.dataOra))}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                      <RotateCcw size={11} /> Rimanda
                    </button>
                    <button
                      onClick={() => handleCaricaAI(p)}
                      disabled={loadingAiId === p.id}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-orange-200 bg-white text-orange-700 hover:bg-orange-50 font-medium transition-colors disabled:opacity-50"
                    >
                      <Sparkles size={11} />
                      {loadingAiId === p.id ? 'Carico…' : 'Aggiungi nota'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
