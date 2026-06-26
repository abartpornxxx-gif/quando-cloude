'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { avanzaFase, terminaGiornata, annullaGiornata, uploadFotoAvanzamento, toggleSpunta, segnalaProblema } from './actions'
import { inviaRapportino } from '../rapportino/actions'
import { Camera, MessageSquare, AlertTriangle, CheckSquare, Clock, MapPin, ClipboardList } from 'lucide-react'

type Fase = 'inizio' | 'mattina' | 'pausa' | 'pomeriggio' | 'fine' | 'completata'

interface Suggerimento {
  id: string
  testo: string
  categoria: string | null
  completato: boolean
}

interface Attrezzatura {
  id: string
  nome: string
}

interface Props {
  giornataId: string
  fase: Fase
  inizioMattina: string | null
  fineMattina: string | null
  inizioPomeriggio: string | null
  commessa: {
    id: string
    nome: string
    indirizzoCantiere?: string | null
    istruzioniCantiere?: string | null
    attrezzatureNecessarie?: string | null
    sopralluogo?: any
  }
  pianificazione: { lavoroDaFare: string | null; noteMateriale: string | null } | null
  foto: { id: string; url: string }[]
  suggerimenti: Suggerimento[]
  attrezzature: Attrezzatura[]
}

function formatMs(ms: number): string {
  if (ms < 60_000) return '0h 0m'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

function calcElapsedMs(inizioMattina: string | null, fineMattina: string | null, inizioPomeriggio: string | null, fase: Fase): number {
  const now = Date.now()
  const mattinaMs = inizioMattina
    ? (fineMattina ? new Date(fineMattina).getTime() - new Date(inizioMattina).getTime() : fase === 'mattina' ? now - new Date(inizioMattina).getTime() : 0)
    : 0
  const pomMs = inizioPomeriggio && fase === 'pomeriggio' ? now - new Date(inizioPomeriggio).getTime() : 0
  return mattinaMs + pomMs
}

export default function FlussoGiornata({
  giornataId, fase,
  inizioMattina, fineMattina, inizioPomeriggio,
  commessa, pianificazione, foto, suggerimenti, attrezzature,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [, setTick] = useState(0)

  const [suggerimentiAperti, setSuggerimentiAperti] = useState(false)
  const [spunteLocali, setSpunteLocali] = useState<Record<string, boolean>>(
    Object.fromEntries(suggerimenti.map(s => [s.id, s.completato]))
  )
  const completati = Object.values(spunteLocali).filter(Boolean).length

  const [mostraProblema, setMostraProblema] = useState(false)
  const [problemaNote, setProblemaNote] = useState('')
  const problemaFileRef = useRef<HTMLInputElement>(null)
  const [problemaPending, startProblemaTransition] = useTransition()

  // Rapportino inline
  const [lavoroEseguito, setLavoroEseguito] = useState('')
  const [oreOrdinarie, setOreOrdinarie] = useState('8')
  const [oreStraordinarie, setOreStraordinarie] = useState('0')
  const [cosaFareDomani, setCosaFareDomani] = useState('')
  const [urgenzaDomani, setUrgenzaDomani] = useState(3)
  const [attrRiconsegnate, setAttrRiconsegnate] = useState<string[]>(attrezzature.map(a => a.id))
  const [rapportinoPending, startRapportinoTransition] = useTransition()
  const [rapportinoErrore, setRapportinoErrore] = useState('')

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const elapsedMs = calcElapsedMs(inizioMattina, fineMattina, inizioPomeriggio, fase)
  const inLavoro = fase === 'mattina' || fase === 'pomeriggio'
  const finito = fase === 'fine' || fase === 'completata'

  // Azioni di base
  function spuntaSuggerimento(id: string) {
    const nuovoStato = !spunteLocali[id]
    setSpunteLocali(prev => ({ ...prev, [id]: nuovoStato }))
    toggleSpunta(giornataId, id, nuovoStato).catch(() => setSpunteLocali(prev => ({ ...prev, [id]: !nuovoStato })))
  }

  function eseguiAvanza() {
    setErrore('')
    startTransition(async () => {
      try { await avanzaFase(giornataId, fase) } catch (err: any) { setErrore(err.message); return }
      router.refresh()
    })
  }

  function eseguiTermina() {
    setErrore('')
    startTransition(async () => {
      try { await terminaGiornata(giornataId) } catch (err: any) { setErrore(err.message); return }
      router.refresh()
    })
  }

  function handleAnnulla() {
    if (!window.confirm('Annullare la giornata? Perderai tutti i dati inseriti.')) return
    startTransition(async () => {
      try { await annullaGiornata(giornataId); router.push('/operaio/dashboard') } catch (err: any) { setErrore(err.message) }
    })
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    let ok = false
    try {
      const fd = new FormData(); fd.append('foto', file)
      await uploadFotoAvanzamento(giornataId, fd)
      ok = true
    } catch (err: any) { setErrore(err.message) } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    if (ok) router.refresh()
  }

  async function handleProblema(e: React.FormEvent) {
    e.preventDefault()
    if (!problemaNote.trim()) return
    startProblemaTransition(async () => {
      let ok = false
      try {
        const fotoFile = problemaFileRef.current?.files?.[0]
        if (fotoFile) {
          const fd = new FormData(); fd.append('foto', fotoFile)
          await uploadFotoAvanzamento(giornataId, fd)
        }
        await segnalaProblema(giornataId, problemaNote.trim())
        setProblemaNote(''); setMostraProblema(false)
        if (problemaFileRef.current) problemaFileRef.current.value = ''
        ok = true
      } catch (err: any) { setErrore(err.message) }
      if (ok) router.refresh()
    })
  }

  function handleRapportino(e: React.FormEvent) {
    e.preventDefault()
    if (!lavoroEseguito.trim()) { setRapportinoErrore('Descrivi il lavoro eseguito'); return }
    const ore = parseFloat(oreOrdinarie) || 0
    if (ore <= 0) { setRapportinoErrore('Inserisci le ore lavorate'); return }
    setRapportinoErrore('')
    startRapportinoTransition(async () => {
      try {
        const url = await inviaRapportino(giornataId, {
          lavoroEseguito: lavoroEseguito.trim(),
          oreOrdinarie: ore,
          oreStraordinarie: parseFloat(oreStraordinarie) || 0,
          attrezzatureIds: attrRiconsegnate,
          cosaFareDomani: cosaFareDomani.trim() || undefined,
          urgenzaDomani: cosaFareDomani.trim() ? urgenzaDomani : undefined,
        })
        router.push(url)
      } catch (err: any) { setRapportinoErrore(err.message) }
    })
  }

  // Costruisco un array di note/istruzioni combinando commessa, sopralluogo e pianificazione
  const noteGenerali = []
  if (commessa.sopralluogo?.istruzioniOperai) noteGenerali.push({ titolo: 'Istruzioni Sopralluogo', testo: commessa.sopralluogo.istruzioniOperai, icon: '🔍' })
  if (commessa.istruzioniCantiere) noteGenerali.push({ titolo: 'Note Cantiere', testo: commessa.istruzioniCantiere, icon: '📋' })
  if (pianificazione?.lavoroDaFare) noteGenerali.push({ titolo: 'Lavoro Assegnato', testo: pianificazione.lavoroDaFare, icon: '🔨' })
  if (commessa.attrezzatureNecessarie) noteGenerali.push({ titolo: 'Attrezzatura Necessaria', testo: commessa.attrezzatureNecessarie, icon: '🔧' })

  return (
    <div className="space-y-4 pb-24">
      {/* Intestazione Cantiere & Timer */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cantiere</p>
            <h1 className="text-xl font-black leading-tight">{commessa.nome}</h1>
            {commessa.indirizzoCantiere && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(commessa.indirizzoCantiere)}`} target="_blank" className="flex items-center gap-1.5 mt-2 text-sm text-blue-400 hover:text-blue-300">
                <MapPin size={14} /> Mappa
              </a>
            )}
          </div>
          {inLavoro && (
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Tempo</p>
              <div className="flex items-center gap-1.5 text-2xl font-black text-emerald-400">
                <Clock size={20} />
                {formatMs(elapsedMs)}
              </div>
            </div>
          )}
        </div>
      </div>

      {errore && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-600 font-medium">{errore}</div>
      )}

      {/* Box Informazioni / Istruzioni (Ben visibile sempre) */}
      {noteGenerali.length > 0 && fase !== 'completata' && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 shadow-sm space-y-4">
          {noteGenerali.map((n, i) => (
            <div key={i}>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>{n.icon}</span> {n.titolo}
              </p>
              <p className="text-sm font-medium text-amber-950 whitespace-pre-wrap leading-snug">{n.testo}</p>
            </div>
          ))}
        </div>
      )}

      {/* AZIONI PRINCIPALI (Inizio / Pausa / Fine) */}
      <div className="sticky top-4 z-20">
        {fase === 'inizio' && (
          <button onClick={eseguiAvanza} disabled={pending} className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-black text-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
            {pending ? '...' : '▶ INIZIA LAVORO'}
          </button>
        )}
        {fase === 'mattina' && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={eseguiAvanza} disabled={pending} className="h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-black text-lg shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2">
              ⏸ PAUSA
            </button>
            <button onClick={eseguiTermina} disabled={pending} className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-95 transition-all text-white font-black text-lg shadow-lg shadow-slate-800/30 flex items-center justify-center gap-2">
              🏁 FINE
            </button>
          </div>
        )}
        {fase === 'pausa' && (
          <button onClick={eseguiAvanza} disabled={pending} className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-black text-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
            ▶ RIPRENDI
          </button>
        )}
        {fase === 'pomeriggio' && (
          <button onClick={eseguiTermina} disabled={pending} className="w-full h-16 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-95 transition-all text-white font-black text-xl shadow-lg shadow-slate-800/30 flex items-center justify-center gap-2">
            🏁 FINE LAVORO
          </button>
        )}
      </div>

      {/* GRIGLIA FUNZIONI RAPIDE (Solo durante il lavoro) */}
      {(inLavoro || fase === 'pausa') && !mostraProblema && (
        <div className="grid grid-cols-2 gap-3 mt-6">
          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 h-28 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all active:scale-95">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} disabled={uploading} className="hidden" />
            <Camera size={32} className={uploading ? 'text-emerald-300 animate-pulse' : 'text-emerald-500'} />
            <span className="text-sm font-bold text-slate-700">{uploading ? 'Caricamento...' : 'Foto Lavoro'}</span>
          </label>
          
          <a href={`/operaio/giornata/${giornataId}/chat`} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 h-28 hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95">
            <MessageSquare size={32} className="text-blue-500" />
            <span className="text-sm font-bold text-slate-700">Chat Ufficio</span>
          </a>

          <button onClick={() => setSuggerimentiAperti(!suggerimentiAperti)} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 h-28 hover:border-violet-400 hover:bg-violet-50 transition-all active:scale-95">
            <CheckSquare size={32} className="text-violet-500" />
            <span className="text-sm font-bold text-slate-700">Checklist ({completati}/{suggerimenti.length})</span>
          </button>

          <button onClick={() => setMostraProblema(true)} className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 h-28 hover:border-red-400 hover:bg-red-50 transition-all active:scale-95">
            <AlertTriangle size={32} className="text-red-500" />
            <span className="text-sm font-bold text-slate-700">Problema</span>
          </button>
        </div>
      )}

      {/* RECENT PHOTOS (Mini gallery if any) */}
      {(inLavoro || fase === 'pausa') && foto.length > 0 && !mostraProblema && (
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {foto.map(f => (
            <img key={f.id} src={f.url} alt="" className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0" />
          ))}
        </div>
      )}

      {/* MODULO PROBLEMA (Mostrato quando richiesto) */}
      {mostraProblema && (
        <form onSubmit={handleProblema} className="rounded-2xl border-2 border-red-500 bg-red-50 p-5 space-y-4 animate-fade-in shadow-lg">
          <div className="flex justify-between items-center">
            <p className="font-black text-red-700 flex items-center gap-2"><AlertTriangle size={18} /> SEGNALA PROBLEMA</p>
            <button type="button" onClick={() => setMostraProblema(false)} className="text-red-400 font-bold p-2">✕</button>
          </div>
          <textarea value={problemaNote} onChange={e => setProblemaNote(e.target.value)} placeholder="Descrivi il problema..." required className="w-full rounded-xl border border-red-200 p-3 text-sm focus:outline-none focus:border-red-500" rows={3} />
          <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-red-300 bg-white font-bold text-red-600 cursor-pointer">
            <Camera size={18} /> Allega foto (opzionale)
            <input ref={problemaFileRef} type="file" accept="image/*" capture="environment" className="hidden" />
          </label>
          <button type="submit" disabled={problemaPending || !problemaNote.trim()} className="w-full rounded-xl bg-red-600 text-white font-black p-4 active:scale-95 transition-all">
            {problemaPending ? 'INVII...' : 'INVIA SEGNALAZIONE'}
          </button>
        </form>
      )}

      {/* CHECKLIST DROPDOWN */}
      {suggerimentiAperti && (
        <div className="rounded-2xl border-2 border-violet-200 bg-white p-4 space-y-2 animate-fade-in shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <p className="font-black text-violet-800 flex items-center gap-2"><ClipboardList size={18} /> CHECKLIST</p>
            <button onClick={() => setSuggerimentiAperti(false)} className="text-violet-400 font-bold p-1">✕</button>
          </div>
          <div className="divide-y divide-slate-100">
            {suggerimenti.map(s => (
              <button key={s.id} type="button" onClick={() => spuntaSuggerimento(s.id)} className="w-full flex items-center gap-3 py-3 text-left">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${spunteLocali[s.id] ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-300 bg-white'}`}>
                  {spunteLocali[s.id] && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <p className={`text-sm font-semibold ${spunteLocali[s.id] ? 'line-through text-slate-400' : 'text-slate-800'}`}>{s.testo}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RAPPORTINO (Fase Fine) */}
      {finito && (
        <form onSubmit={handleRapportino} className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 space-y-5 shadow-lg mt-6">
          <div>
            <p className="font-black text-emerald-900 text-lg">📝 RAPPORTINO FINE GIORNATA</p>
            <p className="text-xs font-semibold text-emerald-700">Obbligatorio per chiudere.</p>
          </div>

          <div>
            <label className="block text-sm font-black text-slate-800 mb-2">Cosa hai fatto oggi? *</label>
            <textarea value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} placeholder="Descrivi i lavori..." className="w-full rounded-xl border-2 border-emerald-200 p-3 text-sm focus:outline-none focus:border-emerald-500" rows={3} />
          </div>

          <div>
            <label className="block text-sm font-black text-slate-800 mb-2">Ore ordinarie *</label>
            <div className="flex gap-2 flex-wrap">
              {['4', '6', '8', '10'].map(v => (
                <button key={v} type="button" onClick={() => setOreOrdinarie(v)} className={`w-14 h-12 rounded-xl font-black text-lg border-2 ${oreOrdinarie === v ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{v}</button>
              ))}
              <input type="number" min="0.5" max="12" step="0.5" value={oreOrdinarie} onChange={e => setOreOrdinarie(e.target.value)} className="w-20 rounded-xl border-2 border-slate-200 px-3 text-center font-bold focus:border-emerald-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-slate-800 mb-2">Ore straordinarie (opzionale)</label>
            <div className="flex gap-2 flex-wrap">
              {['0', '1', '2', '3'].map(v => (
                <button key={v} type="button" onClick={() => setOreStraordinarie(v)} className={`w-14 h-10 rounded-xl font-bold text-base border-2 ${oreStraordinarie === v ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{v}h</button>
              ))}
              <input type="number" min="0" max="6" step="0.5" value={oreStraordinarie} onChange={e => setOreStraordinarie(e.target.value)} className="w-20 rounded-xl border-2 border-slate-200 px-3 text-center font-bold focus:border-amber-500 focus:outline-none" />
            </div>
          </div>

          {attrezzature.length > 0 && (
            <div>
              <label className="block text-sm font-black text-slate-800 mb-2">Attrezzatura riportata in magazzino?</label>
              <div className="space-y-2 bg-white rounded-xl border-2 border-emerald-200 p-3">
                {attrezzature.map(a => (
                  <label key={a.id} className="flex items-center gap-3 p-2 cursor-pointer rounded-lg hover:bg-slate-50">
                    <input type="checkbox" checked={attrRiconsegnate.includes(a.id)} onChange={() => setAttrRiconsegnate(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])} className="w-5 h-5 accent-emerald-600" />
                    <span className="font-semibold text-slate-800">{a.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {rapportinoErrore && <p className="text-red-600 font-bold text-sm bg-red-100 p-3 rounded-xl">{rapportinoErrore}</p>}

          <button type="submit" disabled={rapportinoPending} className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xl py-5 rounded-2xl shadow-lg transition-all">
            {rapportinoPending ? 'INVIO...' : '✅ CHIUDI GIORNATA'}
          </button>
        </form>
      )}

      {fase !== 'completata' && fase !== 'fine' && (
        <div className="pt-8 flex justify-center">
          <button onClick={handleAnnulla} disabled={pending} className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors">
            Annulla giornata
          </button>
        </div>
      )}
    </div>
  )
}
