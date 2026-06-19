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
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { avanzaFase, annullaGiornata, uploadFotoAvanzamento, toggleSpunta } from './actions'

type Fase = 'inizio' | 'mattina' | 'pausa' | 'pomeriggio' | 'fine' | 'completata'

interface Suggerimento {
  id: string
  testo: string
  categoria: string | null
  completato: boolean
}

interface Props {
  giornataId: string
  fase: Fase
  inizioMattina: string | null
  fineMattina: string | null
  inizioPomeriggio: string | null
  finePomeriggio: string | null
  config: {
    durataMattinaMinuti: number
    durataPausaMinuti: number
    durataPomeriggioMinuti: number
  }
  commessa: { id: string; nome: string; indirizzoCantiere?: string | null }
  pianificazione: { lavoroDaFare: string | null; noteMateriale: string | null } | null
  foto: { id: string; url: string }[]
  suggerimenti: Suggerimento[]
}

function calcolaFineMs(inizio: string | null, durataMinuti: number): number | null {
  if (!inizio) return null
  return new Date(inizio).getTime() + durataMinuti * 60_000
}

const FASI_ORDINE: Fase[] = ['inizio', 'mattina', 'pausa', 'pomeriggio', 'fine', 'completata']
const FASE_SHORT: Record<Fase, string> = {
  inizio: 'Inizio',
  mattina: 'Mattina',
  pausa: 'Pausa',
  pomeriggio: 'Pomeriggio',
  fine: 'Fine',
  completata: 'Chiusa',
}

const FASE_BG: Record<Fase, string> = {
  inizio:     'from-slate-700 to-slate-800',
  mattina:    'from-emerald-500 to-emerald-600',
  pausa:      'from-amber-500 to-amber-600',
  pomeriggio: 'from-blue-500 to-blue-600',
  fine:       'from-green-500 to-green-600',
  completata: 'from-gray-500 to-gray-600',
}

export default function FlussoGiornata({
  giornataId, fase,
  inizioMattina, fineMattina, inizioPomeriggio, finePomeriggio,
  config, commessa, pianificazione, foto, suggerimenti,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pronta, setPronta] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [spunteLocali, setSpunteLocali] = useState<Record<string, boolean>>(
    Object.fromEntries(suggerimenti.map(s => [s.id, s.completato]))
  )

  function spuntaSuggerimento(id: string) {
    const nuovoStato = !spunteLocali[id]
    setSpunteLocali(prev => ({ ...prev, [id]: nuovoStato }))
    toggleSpunta(giornataId, id, nuovoStato).catch(() => {
      setSpunteLocali(prev => ({ ...prev, [id]: !nuovoStato }))
    })
  }

  const fineMattinaMs    = calcolaFineMs(inizioMattina,    config.durataMattinaMinuti)
  const finePausaMs      = calcolaFineMs(fineMattina,      config.durataPausaMinuti)
  const finePomeriggioMs = calcolaFineMs(inizioPomeriggio, config.durataPomeriggioMinuti)

  // Ogni 15 s verifica se il tempo di fase è scaduto — sblocca il pulsante senza mostrare countdown
  useEffect(() => {
    function check() {
      const now = Date.now()
      if (fase === 'inizio')     { setPronta(true); return }
      if (fase === 'mattina')    { setPronta(fineMattinaMs !== null && now >= fineMattinaMs); return }
      if (fase === 'pausa')      { setPronta(finePausaMs !== null && now >= finePausaMs); return }
      if (fase === 'pomeriggio') { setPronta(finePomeriggioMs !== null && now >= finePomeriggioMs); return }
      setPronta(true)
    }
    check()
    const t = setInterval(check, 15_000)
    return () => clearInterval(t)
  }, [fase, fineMattinaMs, finePausaMs, finePomeriggioMs])

  function avanza() {
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

  const labelFase: Record<Fase, string> = {
    inizio:     'Pronto a iniziare',
    mattina:    'Sessione mattutina in corso',
    pausa:      'Pausa pranzo',
    pomeriggio: 'Sessione pomeridiana in corso',
    fine:       'Lavori completati',
    completata: 'Giornata chiusa',
  }
  const emojiFase: Record<Fase, string> = {
    inizio: '🌄', mattina: '🌅', pausa: '☕', pomeriggio: '🌆', fine: '✅', completata: '✅',
  }

  const labelPulsante: Partial<Record<Fase, string>> = {
    inizio:     '▶ Inizia sessione mattutina',
    mattina:    '⏸ Vai in pausa pranzo',
    pausa:      '▶ Riprendi lavoro pomeridiano',
    pomeriggio: '🏁 Termina giornata',
  }
  const colorePulsante: Partial<Record<Fase, string>> = {
    inizio:     'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    mattina:    'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    pausa:      'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    pomeriggio: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200',
  }

  const faseIdx = FASI_ORDINE.indexOf(fase)

  return (
    <div className="space-y-4">

      {/* Progress step bar */}
      <div className="flex items-center justify-between px-1 py-2">
        {FASI_ORDINE.map((f, i) => {
          const done = faseIdx > i
          const current = f === fase
          const isLast = i === FASI_ORDINE.length - 1
          return (
            <div key={f} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'w-2.5 h-2.5 rounded-full transition-all duration-300',
                    current
                      ? 'bg-emerald-500 ring-2 ring-emerald-200 scale-125'
                      : done
                      ? 'bg-emerald-400'
                      : 'bg-gray-200',
                  ].join(' ')}
                />
                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                    current ? 'text-emerald-700' : done ? 'text-emerald-400' : 'text-gray-300'
                  }`}
                >
                  {FASE_SHORT[f]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-1 mb-3.5 rounded-full transition-all duration-300 ${
                    done ? 'bg-emerald-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <a href="/operaio/dashboard" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          ‹ Dashboard
        </a>
        <span className="text-xs text-gray-400">La giornata continua in background</span>
      </div>

      {/* Commessa card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cantiere</p>
        <p className="font-bold text-base text-gray-900">{commessa.nome}</p>
        {commessa.indirizzoCantiere && (
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
            <Image src="/immagini/icona-posizione.png" width={13} height={13} alt="" className="shrink-0 opacity-60" />
            {commessa.indirizzoCantiere}
          </p>
        )}
      </div>

      {/* Piano lavoro */}
      {pianificazione?.lavoroDaFare && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-xs font-semibold text-blue-600 mb-1">Lavoro assegnato</p>
          <p className="text-sm text-gray-800">{pianificazione.lavoroDaFare}</p>
        </div>
      )}

      {/* STATO FASE — elemento dominante */}
      <div className={`rounded-2xl bg-gradient-to-br ${FASE_BG[fase]} text-white p-6`}>
        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Stato attuale</p>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emojiFase[fase]}</span>
          <p className="text-xl font-bold leading-tight">{labelFase[fase]}</p>
        </div>

        {!pronta && (fase === 'mattina' || fase === 'pausa' || fase === 'pomeriggio') && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-white/50 animate-pulse" />
              <span className="inline-block w-2 h-2 rounded-full bg-white/50 animate-pulse delay-150" />
              <span className="inline-block w-2 h-2 rounded-full bg-white/50 animate-pulse delay-300" />
            </div>
            <p className="text-white/70 text-sm">In corso — il pulsante si attiverà al termine</p>
          </div>
        )}

        {pronta && (fase === 'mattina' || fase === 'pausa' || fase === 'pomeriggio') && (
          <p className="mt-3 text-white/90 font-semibold text-sm">✓ Pronto per il passo successivo</p>
        )}
      </div>

      {/* Errore */}
      {errore && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <p className="text-red-700 text-sm text-center font-medium">{errore}</p>
        </div>
      )}

      {/* PULSANTE AZIONE — full width, enorme */}
      {fase !== 'fine' && fase !== 'completata' ? (
        <button
          onClick={avanza}
          disabled={pending || !pronta}
          className={[
            'w-full font-bold py-5 rounded-2xl text-white text-lg transition-all shadow-lg active:scale-95',
            pronta && !pending
              ? (colorePulsante[fase] ?? 'bg-gray-600') + ' shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none',
          ].join(' ')}
        >
          {pending
            ? '…'
            : pronta
            ? (labelPulsante[fase] ?? 'Avanza')
            : 'Sessione in corso — attendi…'}
        </button>
      ) : (
        <a
          href={`/operaio/giornata/${giornataId}/rapportino`}
          className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 rounded-2xl text-lg text-center shadow-lg shadow-green-200 transition-all active:scale-95"
        >
          <Image src="/immagini/icona-rapportino.png" width={20} height={20} alt="" className="brightness-0 invert shrink-0" />
          Compila rapportino (obbligatorio)
        </a>
      )}

      {/* Foto avanzamento */}
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

      {/* Promemoria interattivi — visibili in fase fine */}
      {fase === 'fine' && suggerimenti.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100">
            <p className="text-sm font-bold text-emerald-800">
              <Image src="/immagini/successo.png" width={14} height={14} alt="" className="inline-block mr-1 mb-0.5 opacity-80" />
              Promemoria di fine giornata
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {Object.values(spunteLocali).filter(Boolean).length}/{suggerimenti.length} completati
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {suggerimenti.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => spuntaSuggerimento(s.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                  spunteLocali[s.id] ? 'bg-emerald-50/60' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  spunteLocali[s.id]
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-gray-300 bg-white'
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
                  {s.categoria && (
                    <p className="text-xs text-gray-400 mt-0.5">{s.categoria}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <a
        href={`/operaio/giornata/${giornataId}/chat`}
        className="flex items-center gap-3 w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors shadow-sm"
      >
        <Image src="/immagini/icona-chat.png" width={18} height={18} alt="" className="shrink-0 opacity-70" />
        <span className="flex-1">Chat con magazziniere / impresa</span>
        <span className="text-gray-300">›</span>
      </a>

      {/* Annulla */}
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
