'use client'

// TODO LEGALE — Art. 4 L. 300/1970 + GDPR:
// Il sistema registra i timestamp di inizio/fine sessione lavorativa (mattina e pomeriggio).
// Questo costituisce monitoraggio dell'attività a distanza ai sensi dell'art. 4 L. 300/1970.
// OBBLIGATORIO prima del go-live in produzione:
//   1. Informativa ai lavoratori (art. 13 GDPR)
//   2. Accordo sindacale OPPURE autorizzazione dell'Ispettorato Nazionale del Lavoro (art. 4 c. 1 L. 300/1970)
//   3. Valutare DPIA se trattamento ad alto rischio (art. 35 GDPR)
// NON rimuovere questo commento senza aver completato la verifica con il consulente del lavoro/legale.

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { avanzaFase, terminaGiornata, annullaGiornata, uploadFotoAvanzamento, toggleSpunta, segnalaProblema } from './actions'
import { inviaRapportino } from '../rapportino/actions'

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
  commessa: { id: string; nome: string; indirizzoCantiere?: string | null; istruzioniCantiere?: string | null; attrezzatureNecessarie?: string | null }
  pianificazione: { lavoroDaFare: string | null; noteMateriale: string | null } | null
  foto: { id: string; url: string }[]
  suggerimenti: Suggerimento[]
  attrezzature: Attrezzatura[]
}

function formatMs(ms: number): string {
  if (ms < 60_000) return '< 1m'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function calcElapsedMs(
  inizioMattina: string | null,
  fineMattina: string | null,
  inizioPomeriggio: string | null,
  fase: Fase
): number {
  const now = Date.now()
  const mattinaMs = inizioMattina
    ? (fineMattina
      ? new Date(fineMattina).getTime() - new Date(inizioMattina).getTime()
      : fase === 'mattina' ? now - new Date(inizioMattina).getTime() : 0)
    : 0
  const pomMs = inizioPomeriggio && fase === 'pomeriggio'
    ? now - new Date(inizioPomeriggio).getTime()
    : 0
  return mattinaMs + pomMs
}

const STATO_CARD: Record<string, { grad: string; emoji: string; label: string }> = {
  inizio:     { grad: 'from-slate-700 to-slate-800',     emoji: '🌄', label: 'Pronto a iniziare' },
  mattina:    { grad: 'from-emerald-500 to-emerald-700', emoji: '🔨', label: 'In lavoro' },
  pausa:      { grad: 'from-amber-500 to-amber-600',     emoji: '☕', label: 'Pausa' },
  pomeriggio: { grad: 'from-emerald-500 to-emerald-700', emoji: '🔨', label: 'In lavoro' },
  fine:       { grad: 'from-green-600 to-green-700',     emoji: '✅', label: 'Lavori completati' },
  completata: { grad: 'from-gray-500 to-gray-600',       emoji: '✅', label: 'Giornata chiusa' },
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

  // Suggerimenti
  const [suggerimentiAperti, setSuggerimentiAperti] = useState(fase === 'fine')
  const [spunteLocali, setSpunteLocali] = useState<Record<string, boolean>>(
    Object.fromEntries(suggerimenti.map(s => [s.id, s.completato]))
  )

  // Segnala problema
  const [mostraProblema, setMostraProblema] = useState(false)
  const [problemaNote, setProblemaNote] = useState('')
  const problemaFileRef = useRef<HTMLInputElement>(null)
  const [problemaPending, startProblemaTransition] = useTransition()

  // Rapportino inline
  const [lavoroEseguito, setLavoroEseguito] = useState('')
  const [oreOrdinarie, setOreOrdinarie] = useState('8')
  const [cosaFareDomani, setCosaFareDomani] = useState('')
  const [urgenzaDomani, setUrgenzaDomani] = useState(3)
  const [attrRiconsegnate, setAttrRiconsegnate] = useState<string[]>(attrezzature.map(a => a.id))
  const [rapportinoPending, startRapportinoTransition] = useTransition()
  const [rapportinoErrore, setRapportinoErrore] = useState('')

  // Timer aggiorna ogni 60s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const elapsedMs = calcElapsedMs(inizioMattina, fineMattina, inizioPomeriggio, fase)
  const card = STATO_CARD[fase] ?? STATO_CARD.inizio

  function spuntaSuggerimento(id: string) {
    const nuovoStato = !spunteLocali[id]
    setSpunteLocali(prev => ({ ...prev, [id]: nuovoStato }))
    toggleSpunta(giornataId, id, nuovoStato).catch(() => {
      setSpunteLocali(prev => ({ ...prev, [id]: !nuovoStato }))
    })
  }

  function eseguiAvanza() {
    setErrore('')
    startTransition(async () => {
      try {
        await avanzaFase(giornataId, fase)
        router.refresh()
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  function eseguiTermina() {
    setErrore('')
    startTransition(async () => {
      try {
        await terminaGiornata(giornataId)
        router.refresh()
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  function handleAnnulla() {
    if (!window.confirm('Sei sicuro di voler annullare la giornata? Perderai tutti i dati inseriti oggi.')) return
    startTransition(async () => {
      try {
        await annullaGiornata(giornataId)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('foto', file)
      await uploadFotoAvanzamento(giornataId, fd)
      router.refresh()
    } catch (err: unknown) {
      setErrore(err instanceof Error ? err.message : 'Errore upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleProblema(e: React.FormEvent) {
    e.preventDefault()
    if (!problemaNote.trim()) return
    startProblemaTransition(async () => {
      try {
        // Upload foto problema se presente
        const fotoFile = problemaFileRef.current?.files?.[0]
        if (fotoFile) {
          const fd = new FormData()
          fd.append('foto', fotoFile)
          await uploadFotoAvanzamento(giornataId, fd)
          router.refresh()
        }
        await segnalaProblema(giornataId, problemaNote.trim())
        setProblemaNote('')
        setMostraProblema(false)
        if (problemaFileRef.current) problemaFileRef.current.value = ''
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
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
        await inviaRapportino(giornataId, {
          lavoroEseguito: lavoroEseguito.trim(),
          oreOrdinarie: ore,
          oreStraordinarie: 0,
          attrezzatureIds: attrRiconsegnate,
          cosaFareDomani: cosaFareDomani.trim() || undefined,
          urgenzaDomani: cosaFareDomani.trim() ? urgenzaDomani : undefined,
        })
      } catch (err: unknown) {
        const msg = (err as Error)?.message ?? ''
        // i redirect di Next.js propagano come errori: li lasciamo passare
        if (msg.includes('NEXT_REDIRECT')) throw err
        setRapportinoErrore(msg || 'Errore')
      }
    })
  }

  const inLavoro = fase === 'mattina' || fase === 'pomeriggio'

  return (
    <div className="space-y-4">

      {/* Nav + timer */}
      <div className="flex items-center justify-between">
        <a href="/operaio/dashboard" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          ‹ Dashboard
        </a>
        {elapsedMs > 60_000 && (
          <span className="text-sm font-semibold text-gray-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            ⏱ {formatMs(elapsedMs)} in cantiere
          </span>
        )}
      </div>

      {/* Cantiere */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cantiere</p>
        <p className="font-bold text-base text-gray-900">{commessa.nome}</p>
        {commessa.indirizzoCantiere && (
          <p className="text-sm text-gray-500 mt-0.5">{commessa.indirizzoCantiere}</p>
        )}
      </div>

      {/* Piano lavoro */}
      {pianificazione?.lavoroDaFare && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-xs font-semibold text-blue-600 mb-1">Lavoro assegnato</p>
          <p className="text-sm text-gray-800">{pianificazione.lavoroDaFare}</p>
        </div>
      )}

      {/* Istruzioni fisse del cantiere — sempre visibili */}
      {(commessa.istruzioniCantiere || commessa.attrezzatureNecessarie) && fase !== 'completata' && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
          {commessa.istruzioniCantiere && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-0.5">📋 Istruzioni cantiere</p>
              <p className="text-sm text-emerald-900 whitespace-pre-line">{commessa.istruzioniCantiere}</p>
            </div>
          )}
          {commessa.attrezzatureNecessarie && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-0.5">🔧 Porta sempre con te</p>
              <p className="text-sm text-emerald-900 whitespace-pre-line">{commessa.attrezzatureNecessarie}</p>
            </div>
          )}
        </div>
      )}

      {/* Stato card */}
      <div className={`rounded-2xl bg-gradient-to-br ${card.grad} text-white p-5`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{card.emoji}</span>
          <p className="text-xl font-bold">{card.label}</p>
        </div>
        {fase === 'pausa' && (
          <p className="mt-2 text-amber-200 text-sm">Premi Riprendi quando sei pronto.</p>
        )}
        {fase === 'fine' && (
          <p className="mt-2 text-green-200 text-sm">Compila il rapportino qui sotto per chiudere la giornata.</p>
        )}
      </div>

      {/* Errore generico */}
      {errore && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <p className="text-red-700 text-sm font-medium">{errore}</p>
        </div>
      )}

      {/* ─── PULSANTI AZIONE per fase ─────────────────────────────────────────── */}

      {fase === 'inizio' && (
        <button
          onClick={eseguiAvanza}
          disabled={pending}
          className="w-full font-bold py-5 rounded-2xl text-white text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 active:scale-95 transition-all"
        >
          {pending ? '…' : '▶ Inizia giornata'}
        </button>
      )}

      {fase === 'mattina' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={eseguiAvanza}
            disabled={pending}
            className="font-bold py-4 rounded-2xl text-white bg-amber-500 hover:bg-amber-600 shadow-sm disabled:opacity-50 active:scale-95 transition-all"
          >
            {pending ? '…' : '⏸ Pausa'}
          </button>
          <button
            onClick={eseguiTermina}
            disabled={pending}
            className="font-bold py-4 rounded-2xl text-white bg-gray-700 hover:bg-gray-800 shadow-sm disabled:opacity-50 active:scale-95 transition-all"
          >
            {pending ? '…' : '🏁 Fine'}
          </button>
        </div>
      )}

      {fase === 'pausa' && (
        <button
          onClick={eseguiAvanza}
          disabled={pending}
          className="w-full font-bold py-5 rounded-2xl text-white text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 active:scale-95 transition-all"
        >
          {pending ? '…' : '▶ Riprendi lavoro'}
        </button>
      )}

      {fase === 'pomeriggio' && (
        <button
          onClick={eseguiTermina}
          disabled={pending}
          className="w-full font-bold py-5 rounded-2xl text-white text-lg bg-gray-700 hover:bg-gray-800 shadow-lg disabled:opacity-50 active:scale-95 transition-all"
        >
          {pending ? '…' : '🏁 Fine giornata'}
        </button>
      )}

      {/* ─── FOTO (non in avvio/completata) ──────────────────────────────────── */}
      {fase !== 'inizio' && fase !== 'completata' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">📸 Foto avanzamento</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFoto}
              disabled={uploading}
              className="hidden"
            />
            <span className="flex-1 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 text-center hover:border-gray-300 transition-colors">
              {uploading ? 'Upload in corso…' : '+ Aggiungi foto'}
            </span>
          </label>
          {foto.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {foto.map(f => (
                <img
                  key={f.id}
                  src={f.url}
                  alt="foto cantiere"
                  className="aspect-square w-full object-cover rounded-xl border border-gray-200"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SEGNALA PROBLEMA (solo in lavoro) ───────────────────────────────── */}
      {inLavoro && (
        !mostraProblema ? (
          <button
            onClick={() => setMostraProblema(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 hover:border-red-300 hover:bg-red-100 transition-colors"
          >
            ⚠️ Segnala problema
          </button>
        ) : (
          <form onSubmit={handleProblema} className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-red-700">⚠️ Segnala problema</p>
              <button type="button" onClick={() => setMostraProblema(false)} className="text-red-400 text-lg leading-none">✕</button>
            </div>
            <textarea
              value={problemaNote}
              onChange={e => setProblemaNote(e.target.value)}
              placeholder="Descrivi brevemente il problema trovato…"
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
              rows={2}
              required
            />
            <label className="flex items-center gap-2 text-xs text-red-600 cursor-pointer">
              <input ref={problemaFileRef} type="file" accept="image/*" capture="environment" className="hidden" />
              <span className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium hover:bg-red-50">📷 Allega foto (opzionale)</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setMostraProblema(false); setProblemaNote('') }} className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm text-red-600">Annulla</button>
              <button type="submit" disabled={problemaPending || !problemaNote.trim()} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {problemaPending ? 'Invio…' : 'Segnala'}
              </button>
            </div>
          </form>
        )
      )}

      {/* ─── RAPPORTINO INLINE (stato fine) ──────────────────────────────────── */}
      {fase === 'fine' && (
        <form onSubmit={handleRapportino} className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 space-y-4">
          <div>
            <p className="text-sm font-bold text-emerald-900">📋 Rapportino di fine giornata</p>
            <p className="text-xs text-emerald-600 mt-0.5">Compila per chiudere la giornata — obbligatorio</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Cosa hai fatto oggi *</label>
            <textarea
              value={lavoroEseguito}
              onChange={e => setLavoroEseguito(e.target.value)}
              placeholder="Descrivi il lavoro eseguito…"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Ore lavorate *</label>
            <div className="flex gap-2 flex-wrap">
              {['4', '6', '8', '10'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOreOrdinarie(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    oreOrdinarie === v
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {v}h
                </button>
              ))}
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={oreOrdinarie}
                onChange={e => setOreOrdinarie(e.target.value)}
                className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Altro"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Urgenze per domani (opzionale)</label>
            <input
              type="text"
              value={cosaFareDomani}
              onChange={e => setCosaFareDomani(e.target.value)}
              placeholder="Es: finire il quadro al piano 2…"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
            {cosaFareDomani.trim() && (
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setUrgenzaDomani(v)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors ${
                      urgenzaDomani === v
                        ? v >= 4 ? 'bg-red-500 border-red-500 text-white'
                          : v === 3 ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-gray-200 text-gray-500'
                    }`}
                  >
                    {v}{v === 1 ? '🟢' : v === 3 ? '🟡' : v === 5 ? '🔴' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {attrezzature.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Attrezzatura riconsegnata</label>
              <div className="space-y-1.5">
                {attrezzature.map(a => (
                  <label key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attrRiconsegnate.includes(a.id)}
                      onChange={() => setAttrRiconsegnate(prev =>
                        prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]
                      )}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="text-sm font-medium text-gray-800">{a.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {rapportinoErrore && <p className="text-red-600 text-sm font-medium">{rapportinoErrore}</p>}

          <button
            type="submit"
            disabled={rapportinoPending}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl text-base shadow-sm hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition-all"
          >
            {rapportinoPending ? 'Invio in corso…' : '✅ Invia rapportino e chiudi giornata'}
          </button>

          <a
            href={`/operaio/giornata/${giornataId}/rapportino`}
            className="block text-center text-xs text-emerald-700 hover:text-emerald-900 underline"
          >
            Vai al rapportino completo → (reso materiale, note extra, attrezzatura)
          </a>
        </form>
      )}

      {/* ─── SUGGERIMENTI (sempre visibili, collapsibili) ─────────────────────── */}
      {suggerimenti.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setSuggerimentiAperti(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
          >
            <p className="text-sm font-bold text-emerald-800">
              Promemoria cantiere
              <span className="ml-2 text-xs font-normal text-emerald-600">
                {Object.values(spunteLocali).filter(Boolean).length}/{suggerimenti.length} completati
              </span>
            </p>
            <span className="text-gray-400 text-xs">{suggerimentiAperti ? '▲' : '▼'}</span>
          </button>
          {suggerimentiAperti && (
            <div className="border-t border-emerald-100 divide-y divide-gray-100">
              {suggerimenti.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => spuntaSuggerimento(s.id)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                    spunteLocali[s.id] ? 'bg-emerald-50/60' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    spunteLocali[s.id] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'
                  }`}>
                    {spunteLocali[s.id] && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${spunteLocali[s.id] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {s.testo}
                    </p>
                    {s.categoria && <p className="text-xs text-gray-400 mt-0.5">{s.categoria}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      <a
        href={`/operaio/giornata/${giornataId}/chat`}
        className="flex items-center gap-3 w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors shadow-sm"
      >
        <span className="text-lg">💬</span>
        <span className="flex-1">Chat con magazziniere / impresa</span>
        <span className="text-gray-300">›</span>
      </a>

      {/* Annulla (solo se non in fine/completata) */}
      {fase !== 'fine' && fase !== 'completata' && (
        <button
          onClick={handleAnnulla}
          disabled={pending}
          className="w-full text-red-400 text-sm py-3 hover:text-red-600 transition-colors disabled:opacity-40"
        >
          Annulla giornata e ricomincia da capo
        </button>
      )}
    </div>
  )
}
