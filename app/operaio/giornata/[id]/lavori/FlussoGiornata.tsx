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
import { avanzaFase, annullaGiornata, uploadFotoAvanzamento } from './actions'

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

function calcolaFineMs(inizio: string | null, durataMinuti: number): number | null {
  if (!inizio) return null
  return new Date(inizio).getTime() + durataMinuti * 60_000
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
  const [pronta, setPronta] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
    mattina:    '🌅 Sessione mattutina in corso',
    pausa:      '☕ Pausa pranzo',
    pomeriggio: '🌆 Sessione pomeridiana in corso',
    fine:       '✅ Lavori completati — compila il rapportino',
    completata: '✅ Giornata chiusa',
  }

  const labelPulsante: Partial<Record<Fase, string>> = {
    inizio:     '▶ Inizia sessione mattutina',
    mattina:    '⏸ Vai in pausa pranzo',
    pausa:      '▶ Riprendi lavoro pomeridiano',
    pomeriggio: '🏁 Termina giornata',
  }

  const colorePulsante: Partial<Record<Fase, string>> = {
    inizio:     'bg-green-600 hover:bg-green-700',
    mattina:    'bg-amber-500 hover:bg-amber-600',
    pausa:      'bg-blue-600 hover:bg-blue-700',
    pomeriggio: 'bg-orange-500 hover:bg-orange-600',
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      {/* ORDINE 3 — Link dashboard: navigare via non interrompe la giornata */}
      <div className="flex items-center justify-between text-sm">
        <a href="/operaio/dashboard" className="text-blue-600 hover:underline font-medium">‹ Torna alla dashboard</a>
        <span className="text-xs text-gray-400">La giornata continua in background</span>
      </div>

      {/* Commessa */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cantiere</p>
        <p className="font-bold text-lg">{commessa.nome}</p>
        {commessa.indirizzoCantiere && <p className="text-sm text-gray-500">📍 {commessa.indirizzoCantiere}</p>}
      </div>

      {/* Indicazioni impresa (sola lettura) */}
      {pianificazione?.lavoroDaFare && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-600 mb-1">Lavoro assegnato:</p>
          <p className="text-sm text-gray-800">{pianificazione.lavoroDaFare}</p>
        </div>
      )}

      {/* ORDINE 1 — Stato fase: NESSUN countdown visibile all'operaio */}
      <div className="bg-white rounded-xl border p-5 text-center space-y-3">
        <p className="text-2xl font-bold">{labelFase[fase]}</p>

        {/* Sessione non ancora completata → messaggio generico senza timer */}
        {!pronta && (fase === 'mattina' || fase === 'pausa' || fase === 'pomeriggio') && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-150" />
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-300" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Sessione in corso…</p>
            <p className="text-xs text-gray-400 mt-1">Il pulsante si attiverà al termine</p>
          </div>
        )}

        {/* Sessione completata → feedback positivo */}
        {pronta && (fase === 'mattina' || fase === 'pausa' || fase === 'pomeriggio') && (
          <p className="text-green-600 font-semibold text-sm">✓ Puoi procedere</p>
        )}
      </div>

      {errore && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-700 text-sm text-center">{errore}</p>
        </div>
      )}

      {/* ORDINE 2 — Pulsante bloccato finché il tempo non è scaduto */}
      {fase !== 'fine' && fase !== 'completata' && (
        <button
          onClick={avanza}
          disabled={pending || !pronta}
          className={[
            'w-full font-bold py-4 rounded-xl text-white text-lg transition-all',
            pronta && !pending ? colorePulsante[fase] : 'bg-gray-300 cursor-not-allowed',
          ].join(' ')}
        >
          {pending
            ? '…'
            : pronta
            ? (labelPulsante[fase] ?? 'Avanza')
            : 'Sessione in corso — attendi…'}
        </button>
      )}

      {/* Rapportino: sbloccato SOLO dopo fase 'fine' */}
      {(fase === 'fine' || fase === 'completata') && (
        <a
          href={`/operaio/giornata/${giornataId}/rapportino`}
          className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-lg text-center"
        >
          📋 Compila rapportino (obbligatorio)
        </a>
      )}

      {/* Foto avanzamento */}
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

      {/* Chat */}
      <a
        href={`/operaio/giornata/${giornataId}/chat`}
        className="block w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-center text-sm"
      >
        💬 Chat con magazziniere / impresa
      </a>

      {/* ORDINE 3 — Annulla giornata (solo se non terminata) */}
      {fase !== 'fine' && fase !== 'completata' && (
        <button
          onClick={handleAnnulla}
          disabled={pending}
          className="w-full text-red-500 text-sm py-2 hover:underline disabled:opacity-40"
        >
          Annulla giornata e ricomincia da capo
        </button>
      )}
    </div>
  )
}
