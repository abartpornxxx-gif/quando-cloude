'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Send, X, ChevronDown, ChevronUp, Calendar, Clock, MapPin, User, Building2, AlertCircle, Check } from 'lucide-react'
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
  const [bozza, setBozza] = useState<Bozza | null>(null)
  const [errore, setErrore] = useState('')
  const [pending, startTransition] = useTransition()
  const [salvato, setSalvato] = useState(false)

  // Campi modificabili della bozza
  const [bTitolo, setBTitolo] = useState('')
  const [bData, setBData] = useState('')
  const [bOra, setBOra] = useState('')
  const [bLuogo, setBLuogo] = useState('')
  const [bDescrizione, setBDescrizione] = useState('')
  const [bPriorita, setBPriorita] = useState('normale')
  const [bTipo, setBTipo] = useState('altro')
  const [bOperaioId, setBOperaioId] = useState('')
  const [bClienteId, setBClienteId] = useState('')
  const [bCommessaId, setBCommessaId] = useState('')

  function applicaBozza(b: Bozza) {
    setBozza(b)
    setBTitolo(b.titolo || '')
    setBData(b.data || '')
    setBOra(b.ora || '')
    setBLuogo(b.luogo || '')
    setBDescrizione(b.descrizione || '')
    setBPriorita(b.priorita || 'normale')
    setBTipo(b.tipo || 'altro')
    setBOperaioId('')
    setBClienteId('')
    setBCommessaId('')
    // Prova a trovare il cliente per nome
    if (b.clienteNome) {
      const trovato = clienti.find(c => c.nome.toLowerCase().includes(b.clienteNome!.toLowerCase()))
      if (trovato) setBClienteId(trovato.id)
    }
    if (b.operaioNome) {
      const trovato = operai.find(o => o.nome.toLowerCase().includes(b.operaioNome!.toLowerCase()))
      if (trovato) setBOperaioId(trovato.id)
    }
  }

  async function handlePrepara() {
    if (!testo.trim()) return
    setLoading(true)
    setErrore('')
    setBozza(null)

    try {
      const res = await fetch('/api/ai/promemoria/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: testo.trim() }),
      })
      const data = await res.json()

      if (data.bozza) {
        applicaBozza(data.bozza)
      } else {
        setErrore(data.error || 'Non sono riuscito a interpretare il testo. Prova a essere più specifico.')
      }
    } catch {
      setErrore('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  function handleConferma() {
    if (!bTitolo.trim() || !bData || !bOra) return
    startTransition(async () => {
      try {
        const dataOraLocal = `${bData}T${bOra}`
        const dataOraUTC = new Date(dataOraLocal).toISOString()

        await creaPromemoriaAI({
          titolo:              bTitolo.trim(),
          descrizione:         bDescrizione || undefined,
          luogo:               bLuogo || undefined,
          dataOra:             dataOraUTC,
          assegnatoAOperaioId: bOperaioId || undefined,
          perImpresa:          !bOperaioId,
          priorita:            bPriorita,
          clienteId:           bClienteId || undefined,
          commessaId:          bCommessaId || undefined,
          tipo:                bTipo,
          origineAi:           true,
          testoOriginaleAi:    bozza?.testoOriginale || testo,
        })

        setSalvato(true)
        setBozza(null)
        setTesto('')
        onSalvato()
        setTimeout(() => { setSalvato(false); setAperto(false) }, 2000)
      } catch (err) {
        setErrore('Errore nel salvataggio. Riprova.')
      }
    })
  }

  function handleAnnulla() {
    setBozza(null)
    setErrore('')
  }

  const inputClass = `w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-${accentColor}-500/20 focus:bg-white`
  const labelClass = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-5">
      {/* Header collapsible */}
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
              <p className="text-sm font-semibold text-emerald-800">Promemoria salvato.</p>
            </div>
          )}

          {!bozza && (
            <>
              {/* Esempi rapidi */}
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

              {/* Input testo */}
              <div>
                <label className={labelClass}>Descrivi cosa vuoi ricordare</label>
                <textarea
                  value={testo}
                  onChange={e => setTesto(e.target.value)}
                  rows={3}
                  placeholder="Es: Domani alle 9 sopralluogo da Mario Rossi a Casoria…"
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

          {/* Bozza modificabile */}
          {bozza && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                <Sparkles size={13} className="text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 flex-1">Bozza generata dall'AI. Controlla e modifica prima di salvare.</p>
                <button onClick={handleAnnulla} className="text-blue-400 hover:text-blue-600">
                  <X size={14} />
                </button>
              </div>

              {/* Badge tipo + priorità */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  {LABEL_TIPO[bTipo] || bTipo}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${COLOR_PRIORITA[bPriorita] || COLOR_PRIORITA.normale}`}>
                  {bPriorita.charAt(0).toUpperCase() + bPriorita.slice(1)}
                </span>
              </div>

              <div>
                <label className={labelClass}>Titolo *</label>
                <input value={bTitolo} onChange={e => setBTitolo(e.target.value)} className={inputClass} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${labelClass} flex items-center gap-1`}><Calendar size={9} /> Data *</label>
                  <input type="date" value={bData} onChange={e => setBData(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={`${labelClass} flex items-center gap-1`}><Clock size={9} /> Ora *</label>
                  <input type="time" value={bOra} onChange={e => setBOra(e.target.value)} className={inputClass} required />
                </div>
              </div>

              <div>
                <label className={`${labelClass} flex items-center gap-1`}><MapPin size={9} /> Luogo</label>
                <input value={bLuogo} onChange={e => setBLuogo(e.target.value)} placeholder="Indirizzo o luogo" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Note</label>
                <textarea value={bDescrizione} onChange={e => setBDescrizione(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>

              <div>
                <label className={`${labelClass} flex items-center gap-1`}><User size={9} /> Assegna a operaio</label>
                <select value={bOperaioId} onChange={e => setBOperaioId(e.target.value)} className={inputClass}>
                  <option value="">— Solo impresa/ufficio —</option>
                  {operai.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={`${labelClass} flex items-center gap-1`}><User size={9} /> Cliente collegato</label>
                <select value={bClienteId} onChange={e => setBClienteId(e.target.value)} className={inputClass}>
                  <option value="">— Nessuno —</option>
                  {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={`${labelClass} flex items-center gap-1`}><Building2 size={9} /> Commessa collegata</label>
                <select value={bCommessaId} onChange={e => setBCommessaId(e.target.value)} className={inputClass}>
                  <option value="">— Nessuna —</option>
                  {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Priorità</label>
                <select value={bPriorita} onChange={e => setBPriorita(e.target.value)} className={inputClass}>
                  <option value="bassa">Bassa</option>
                  <option value="normale">Normale</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

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
                  onClick={handleConferma}
                  disabled={!bTitolo.trim() || !bData || !bOra || pending}
                  className={`flex-1 py-2 rounded-xl bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  <Check size={15} />
                  {pending ? 'Salvataggio…' : 'Conferma e salva'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
