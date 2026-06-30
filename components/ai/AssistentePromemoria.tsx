'use client'

import { useState, useTransition } from 'react'
import { Sparkles, X, ChevronDown, ChevronUp, Calendar, Clock, MapPin, User, Building2, AlertCircle, Check } from 'lucide-react'
import { creaPromemoriaAI } from '@/app/ufficio/promemoria/actions'

type OperaioDD = { id: string; nome: string }
type ClienteDD = { id: string; nome: string }
type CommessaDD = { id: string; nome: string }

interface Bozza {
  titolo: string
  tipo: string
  data: string | null
  ora: string | null
  priorita: string
  luogo: string | null
  descrizione: string | null
  clienteNome: string | null
  operaioNome: string | null
  note: string | null
  testoOriginale: string
}

interface BozzaStato {
  uid: string
  raw: Bozza
  titolo: string
  data: string
  ora: string
  luogo: string
  descrizione: string
  priorita: string
  tipo: string
  operaioId: string
  clienteId: string
  commessaId: string
}

const ESEMPI = [
  'Domani alle 9 sopralluogo da Mario Rossi a Casoria',
  'Urgente oggi pomeriggio: salvavita che scatta in via Roma 5',
  'Ricordami lunedì di chiamare il cliente Castaldo per il preventivo',
  'Venerdì mattina ordinare placche Living Now per cantiere',
]

const LABEL_TIPO: Record<string, string> = {
  sopralluogo: 'Sopralluogo', intervento_urgente: 'Intervento urgente', chiamata_cliente: 'Chiamata cliente',
  ordine_materiale: 'Ordine materiale', attivita_ufficio: 'Attività ufficio', appuntamento: 'Appuntamento',
  scadenza: 'Scadenza', nota_interna: 'Nota interna', promemoria_operaio: 'Promemoria operaio', altro: 'Altro',
}
const COLOR_PRIORITA: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta:    'bg-orange-100 text-orange-700 border-orange-200',
  normale: 'bg-blue-50 text-blue-600 border-blue-100',
  bassa:   'bg-gray-100 text-gray-500 border-gray-200',
}

interface Props {
  operai: OperaioDD[]
  clienti: ClienteDD[]
  commesse: CommessaDD[]
  onSalvato: () => void
  accentColor?: string
}

export function AssistentePromemoria({ operai, clienti, commesse, onSalvato, accentColor = 'blue' }: Props) {
  const [aperto, setAperto] = useState(false)
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(false)
  const [bozzeStato, setBozzeStato] = useState<BozzaStato[]>([])
  const [errore, setErrore] = useState('')
  const [pending, startTransition] = useTransition()
  const [salvato, setSalvato] = useState(false)
  const [salvateCount, setSalvateCount] = useState(0)

  function inizializzaBozza(b: Bozza, uid: string): BozzaStato {
    const operaioId = b.operaioNome
      ? (operai.find(o => o.nome.toLowerCase().includes(b.operaioNome!.toLowerCase()))?.id || '')
      : ''
    const clienteId = b.clienteNome
      ? (clienti.find(c => c.nome.toLowerCase().includes(b.clienteNome!.toLowerCase()))?.id || '')
      : ''
    return {
      uid, raw: b,
      titolo: b.titolo || '',
      data: b.data || '',
      ora: b.ora || '',
      luogo: b.luogo || '',
      descrizione: b.descrizione || b.note || '',
      priorita: b.priorita || 'normale',
      tipo: b.tipo || 'altro',
      operaioId, clienteId, commessaId: '',
    }
  }

  function updateBozza(uid: string, patch: Partial<BozzaStato>) {
    setBozzeStato(prev => prev.map(b => b.uid === uid ? { ...b, ...patch } : b))
  }

  function removeBozza(uid: string) {
    setBozzeStato(prev => prev.filter(b => b.uid !== uid))
  }

  async function handlePrepara() {
    if (!testo.trim()) return
    setLoading(true)
    setErrore('')
    setBozzeStato([])

    try {
      const res = await fetch('/api/ai/promemoria/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: testo.trim() }),
      })
      const data = await res.json()

      if (data.bozze && Array.isArray(data.bozze) && data.bozze.length > 0) {
        setBozzeStato(data.bozze.map((b: Bozza, i: number) =>
          inizializzaBozza(b, `b-${i}-${Date.now()}`)
        ))
      } else {
        setErrore(data.error || 'Non sono riuscito a interpretare il testo. Prova a essere più specifico.')
      }
    } catch {
      setErrore('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  async function salvaUnaBozza(b: BozzaStato) {
    const dataOraLocal = `${b.data}T${b.ora}`
    const dataOraUTC = new Date(dataOraLocal).toISOString()
    await creaPromemoriaAI({
      titolo:              b.titolo.trim(),
      descrizione:         b.descrizione || undefined,
      luogo:               b.luogo || undefined,
      dataOra:             dataOraUTC,
      assegnatoAOperaioId: b.operaioId || undefined,
      perImpresa:          !b.operaioId,
      priorita:            b.priorita,
      clienteId:           b.clienteId || undefined,
      commessaId:          b.commessaId || undefined,
      tipo:                b.tipo,
      origineAi:           true,
      testoOriginaleAi:    testo || b.raw.testoOriginale,
    })
  }

  function handleConfermaTowards() {
    startTransition(async () => {
      const valide = bozzeStato.filter(b => b.titolo.trim() && b.data && b.ora)
      if (valide.length === 0) {
        setErrore('Compila almeno titolo, data e ora prima di salvare.')
        return
      }
      let count = 0
      for (const b of valide) {
        try { await salvaUnaBozza(b); count++ } catch { /* skip */ }
      }
      if (count > 0) {
        setSalvateCount(count)
        setSalvato(true)
        setBozzeStato([])
        setTesto('')
        onSalvato()
        setTimeout(() => { setSalvato(false); setAperto(false) }, 2500)
      } else {
        setErrore('Errore nel salvataggio. Riprova.')
      }
    })
  }

  function handleConfermaUna(uid: string) {
    const b = bozzeStato.find(x => x.uid === uid)
    if (!b || !b.titolo.trim() || !b.data || !b.ora) return
    startTransition(async () => {
      try {
        await salvaUnaBozza(b)
        onSalvato()
        const restanti = bozzeStato.filter(x => x.uid !== uid)
        if (restanti.length === 0) {
          setSalvateCount(1)
          setSalvato(true)
          setTesto('')
          setBozzeStato([])
          setTimeout(() => { setSalvato(false); setAperto(false) }, 2000)
        } else {
          setBozzeStato(restanti)
        }
      } catch {
        setErrore('Errore nel salvataggio. Riprova.')
      }
    })
  }

  function handleAnnulla() {
    setBozzeStato([])
    setErrore('')
  }

  const inputClass = `w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-${accentColor}-500/20 focus:bg-white`
  const labelClass = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-5">
      <button
        onClick={() => setAperto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-${accentColor}-50 shrink-0`}>
          <Sparkles size={16} className={`text-${accentColor}-600`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-800">Assistente AI promemoria</p>
          <p className="text-[11px] text-gray-400">Descrivi cosa vuoi ricordare, ci penso io</p>
        </div>
        {aperto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {aperto && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {salvato && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">
                {salvateCount > 1 ? `${salvateCount} promemoria salvati.` : 'Promemoria salvato.'}
              </p>
            </div>
          )}

          {bozzeStato.length === 0 && (
            <>
              <div>
                <p className={labelClass}>Esempi rapidi</p>
                <div className="flex flex-wrap gap-1.5">
                  {ESEMPI.map(e => (
                    <button
                      key={e}
                      onClick={() => setTesto(e)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Descrivi cosa vuoi ricordare</label>
                <textarea
                  value={testo}
                  onChange={e => setTesto(e.target.value)}
                  rows={3}
                  placeholder="Es: Domani alle 9 sopralluogo da Mario Rossi, poi alle 14 chiamare il fornitore…"
                  className={`${inputClass} resize-none`}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handlePrepara() }}
                />
              </div>

              {errore && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{errore}</p>
                </div>
              )}

              <button
                onClick={handlePrepara}
                disabled={!testo.trim() || loading}
                className={`w-full flex items-center justify-center gap-2 bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50`}
              >
                <Sparkles size={15} />
                {loading ? 'Sto preparando…' : 'Prepara promemoria'}
              </button>
            </>
          )}

          {bozzeStato.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-blue-500" />
                  <p className="text-xs font-semibold text-blue-700">
                    {bozzeStato.length === 1
                      ? '1 promemoria trovato — controlla e modifica'
                      : `${bozzeStato.length} promemoria trovati — controlla e modifica`}
                  </p>
                </div>
                <button onClick={handleAnnulla} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Annulla
                </button>
              </div>

              {bozzeStato.map((b, i) => (
                <div key={b.uid} className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {bozzeStato.length > 1 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                    )}
                    <div className="flex gap-2 flex-1 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {LABEL_TIPO[b.tipo] || b.tipo}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${COLOR_PRIORITA[b.priorita] || COLOR_PRIORITA.normale}`}>
                        {b.priorita.charAt(0).toUpperCase() + b.priorita.slice(1)}
                      </span>
                    </div>
                    <button onClick={() => removeBozza(b.uid)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <X size={14} />
                    </button>
                  </div>

                  <div>
                    <label className={labelClass}>Titolo *</label>
                    <input
                      value={b.titolo}
                      onChange={e => updateBozza(b.uid, { titolo: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`${labelClass} flex items-center gap-1`}><Calendar size={9} /> Data *</label>
                      <input
                        type="date"
                        value={b.data}
                        onChange={e => updateBozza(b.uid, { data: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={`${labelClass} flex items-center gap-1`}><Clock size={9} /> Ora *</label>
                      <input
                        type="time"
                        value={b.ora}
                        onChange={e => updateBozza(b.uid, { ora: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`${labelClass} flex items-center gap-1`}><MapPin size={9} /> Luogo</label>
                    <input
                      value={b.luogo}
                      onChange={e => updateBozza(b.uid, { luogo: e.target.value })}
                      placeholder="Indirizzo o luogo"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Note</label>
                    <textarea
                      value={b.descrizione}
                      onChange={e => updateBozza(b.uid, { descrizione: e.target.value })}
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div>
                    <label className={`${labelClass} flex items-center gap-1`}><User size={9} /> Assegna a operaio</label>
                    <select value={b.operaioId} onChange={e => updateBozza(b.uid, { operaioId: e.target.value })} className={inputClass}>
                      <option value="">— Solo impresa/ufficio —</option>
                      {operai.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={`${labelClass} flex items-center gap-1`}><User size={9} /> Cliente collegato</label>
                    <select value={b.clienteId} onChange={e => updateBozza(b.uid, { clienteId: e.target.value })} className={inputClass}>
                      <option value="">— Nessuno —</option>
                      {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={`${labelClass} flex items-center gap-1`}><Building2 size={9} /> Commessa collegata</label>
                    <select value={b.commessaId} onChange={e => updateBozza(b.uid, { commessaId: e.target.value })} className={inputClass}>
                      <option value="">— Nessuna —</option>
                      {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Priorità</label>
                    <select value={b.priorita} onChange={e => updateBozza(b.uid, { priorita: e.target.value })} className={inputClass}>
                      <option value="bassa">Bassa</option>
                      <option value="normale">Normale</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>

                  {bozzeStato.length > 1 && (
                    <button
                      onClick={() => handleConfermaUna(b.uid)}
                      disabled={!b.titolo.trim() || !b.data || !b.ora || pending}
                      className="w-full text-xs py-1.5 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-100 font-medium transition-colors disabled:opacity-40"
                    >
                      Salva solo questo
                    </button>
                  )}
                </div>
              ))}

              {errore && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{errore}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAnnulla}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfermaTowards}
                  disabled={bozzeStato.every(b => !b.titolo.trim() || !b.data || !b.ora) || pending}
                  className={`flex-1 py-2 rounded-xl bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  <Check size={15} />
                  {pending
                    ? 'Salvataggio…'
                    : bozzeStato.length === 1
                      ? 'Conferma e salva'
                      : `Salva tutti (${bozzeStato.length})`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
