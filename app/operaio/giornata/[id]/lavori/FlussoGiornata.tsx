'use client'

// TODO LEGALE — Art. 4 L. 300/1970 + GDPR:
// Il sistema di countdown registra i timestamp di inizio/fine sessione lavorativa (mattina e pomeriggio).
// Questo costituisce monitoraggio dell'attività a distanza ai sensi dell'art. 4 L. 300/1970.
// OBBLIGATORIO prima del go-live in produzione:
//   1. Informativa ai lavoratori (art. 13 GDPR)
//   2. Accordo sindacale OPPURE autorizzazione dell'Ispettorato Nazionale del Lavoro (art. 4 c. 1 L. 300/1970)
//   3. Valutare DPIA se trattamento ad alto rischio (art. 35 GDPR)
// NON rimuovere questo commento senza aver completato la verifica con il consulente del lavoro/legale.

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { avanzaFase, uploadFotoAvanzamento } from './actions'

type Fase = 'inizio' | 'mattina' | 'pausa' | 'pomeriggio' | 'fine' | 'completata'

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
}

function useCountdown(targetMs: number | null): number {
  const [rimanenti, setRimanenti] = useState<number>(0)
  useEffect(() => {
    if (targetMs === null) return
    const aggiorna = () => setRimanenti(Math.max(0, targetMs - Date.now()))
    aggiorna()
    const t = setInterval(aggiorna, 1000)
    return () => clearInterval(t)
  }, [targetMs])
  return rimanenti
}

function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function calcolaFine(inizio: string | null, durataMinuti: number): number | null {
  if (!inizio) return null
  return new Date(inizio).getTime() + durataMinuti * 60 * 1000
}

export default function FlussoGiornata({
  giornataId, fase,
  inizioMattina, fineMattina, inizioPomeriggio, finePomeriggio,
  config, commessa, pianificazione, foto,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fineMattinaMs = calcolaFine(inizioMattina, config.durataMattinaMinuti)
  const finePausaMs = calcolaFine(fineMattina, config.durataPausaMinuti)
  const finePomeriggioMs = calcolaFine(inizioPomeriggio, config.durataPomeriggioMinuti)

  const countdownMattina = useCountdown(fase === 'mattina' ? fineMattinaMs : null)
  const countdownPausa = useCountdown(fase === 'pausa' ? finePausaMs : null)
  const countdownPomeriggio = useCountdown(fase === 'pomeriggio' ? finePomeriggioMs : null)

  // Avanza automaticamente se il countdown è scaduto
  useEffect(() => {
    if (fase === 'mattina' && countdownMattina === 0 && fineMattinaMs && Date.now() >= fineMattinaMs) {
      // Mostra solo il pulsante, non avanzare automaticamente (l'operaio decide)
    }
  }, [fase, countdownMattina, fineMattinaMs])

  function avanza() {
    startTransition(async () => {
      try {
        await avanzaFase(giornataId, fase)
        router.refresh()
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
    inizio: 'Pronto a iniziare',
    mattina: '🌅 Sessione mattutina',
    pausa: '☕ Pausa pranzo',
    pomeriggio: '🌆 Sessione pomeridiana',
    fine: '✅ Lavori completati',
    completata: '✅ Giornata chiusa',
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      {/* Stato commessa */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Cantiere</p>
        <p className="font-bold text-lg">{commessa.nome}</p>
        {commessa.indirizzoCantiere && <p className="text-sm text-gray-500">📍 {commessa.indirizzoCantiere}</p>}
      </div>

      {/* Indicazioni impresa (sempre visibili) */}
      {pianificazione?.lavoroDaFare && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-600 mb-1">Lavoro assegnato:</p>
          <p className="text-sm text-gray-800">{pianificazione.lavoroDaFare}</p>
        </div>
      )}

      {/* Fase corrente */}
      <div className="bg-white rounded-xl border p-4 text-center">
        <p className="text-2xl font-bold">{labelFase[fase]}</p>

        {/* Countdown mattina */}
        {fase === 'mattina' && (
          <div className="mt-3">
            {countdownMattina > 0 ? (
              <>
                <p className="text-5xl font-mono font-bold text-blue-600">{formatCountdown(countdownMattina)}</p>
                <p className="text-sm text-gray-500 mt-1">Tempo rimanente sessione mattutina</p>
              </>
            ) : (
              <p className="text-green-600 font-semibold mt-2">Sessione completata — puoi fare pausa</p>
            )}
          </div>
        )}

        {/* Countdown pausa */}
        {fase === 'pausa' && (
          <div className="mt-3">
            {countdownPausa > 0 ? (
              <>
                <p className="text-5xl font-mono font-bold text-amber-500">{formatCountdown(countdownPausa)}</p>
                <p className="text-sm text-gray-500 mt-1">Durata pausa</p>
              </>
            ) : (
              <p className="text-green-600 font-semibold mt-2">Pausa terminata — puoi riprendere</p>
            )}
          </div>
        )}

        {/* Countdown pomeriggio */}
        {fase === 'pomeriggio' && (
          <div className="mt-3">
            {countdownPomeriggio > 0 ? (
              <>
                <p className="text-5xl font-mono font-bold text-orange-500">{formatCountdown(countdownPomeriggio)}</p>
                <p className="text-sm text-gray-500 mt-1">Tempo rimanente sessione pomeridiana</p>
              </>
            ) : (
              <p className="text-green-600 font-semibold mt-2">Sessione completata — puoi chiudere</p>
            )}
          </div>
        )}
      </div>

      {errore && <p className="text-red-600 text-sm text-center">{errore}</p>}

      {/* Pulsante avanzamento fase */}
      {fase !== 'fine' && fase !== 'completata' && (
        <button
          onClick={avanza}
          disabled={pending}
          className={[
            'w-full font-bold py-4 rounded-xl text-white text-lg disabled:opacity-50',
            fase === 'inizio' ? 'bg-green-600' :
            fase === 'mattina' ? 'bg-amber-500' :
            fase === 'pausa' ? 'bg-blue-600' :
            'bg-orange-500',
          ].join(' ')}
        >
          {pending ? '…' :
            fase === 'inizio' ? '▶ Inizia sessione mattutina' :
            fase === 'mattina' ? '⏸ Vai in pausa' :
            fase === 'pausa' ? '▶ Riprendi lavoro' :
            '🏁 Termina giornata'}
        </button>
      )}

      {/* Rapportino sbloccato solo dopo "fine" */}
      {(fase === 'fine' || fase === 'completata') && (
        <a
          href={`/operaio/giornata/${giornataId}/rapportino`}
          className="block w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg text-center"
        >
          📋 Compila rapportino
        </a>
      )}

      {/* Foto avanzamento (sempre disponibile durante la giornata) */}
      {fase !== 'inizio' && fase !== 'completata' && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">📸 Foto avanzamento</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFoto}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
          />
          {uploading && <p className="text-xs text-gray-400 mt-1">Upload in corso…</p>}
          {foto.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {foto.map(f => (
                <img key={f.id} src={f.url} alt="foto cantiere" className="w-16 h-16 object-cover rounded-lg border" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link chat */}
      <a
        href={`/operaio/giornata/${giornataId}/chat`}
        className="block w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-center text-sm"
      >
        💬 Chat con magazziniere / impresa
      </a>
    </div>
  )
}
