'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { inviaMsgOperaio, richiediMateriale, getMessaggi } from './actions'

type Messaggio = {
  id: string
  autoreNome: string
  ruolo: string
  testo: string | null
  fotoUrl: string | null
  createdAt: Date | string
}

interface Props {
  giornataId: string
  messaggi: Messaggio[]
}

export default function ChatGiornata({ giornataId, messaggi: messaggiIniziali }: Props) {
  const [messaggi, setMessaggi] = useState<Messaggio[]>(messaggiIniziali)
  const [testo, setTesto] = useState('')
  const [mostraRichiesta, setMostraRichiesta] = useState(false)
  const [descRichiesta, setDescRichiesta] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Polling ogni 30 secondi
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const nuovi = await getMessaggi(giornataId)
        setMessaggi(nuovi as Messaggio[])
      } catch {}
    }, 30_000)
    return () => clearInterval(poll)
  }, [giornataId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  function inviaMessaggio() {
    if (!testo.trim()) return
    startTransition(async () => {
      try {
        await inviaMsgOperaio(giornataId, testo)
        setTesto('')
        const nuovi = await getMessaggi(giornataId)
        setMessaggi(nuovi as Messaggio[])
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  function inviaRichiesta() {
    if (!descRichiesta.trim()) return
    startTransition(async () => {
      try {
        await richiediMateriale(giornataId, descRichiesta, urgente)
        setDescRichiesta('')
        setUrgente(false)
        setMostraRichiesta(false)
        const nuovi = await getMessaggi(giornataId)
        setMessaggi(nuovi as Messaggio[])
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messaggi.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">Nessun messaggio ancora</p>
        )}
        {messaggi.map(m => (
          <div
            key={m.id}
            className={['flex', m.ruolo === 'operaio' ? 'justify-end' : 'justify-start'].join(' ')}
          >
            <div
              className={[
                'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                m.ruolo === 'operaio'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : m.ruolo === 'magazziniere'
                  ? 'bg-yellow-100 text-gray-800 rounded-tl-none border border-yellow-200'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none',
              ].join(' ')}
            >
              <p className="text-xs opacity-70 mb-1">{m.autoreNome}</p>
              {m.testo && <p>{m.testo}</p>}
              {m.fotoUrl && <img src={m.fotoUrl} alt="foto" className="mt-1 rounded-lg max-w-full" />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {errore && <p className="text-red-600 text-xs text-center px-4">{errore}</p>}

      {/* Form richiesta materiale */}
      {mostraRichiesta && (
        <div className="bg-yellow-50 border-t border-yellow-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-800">📦 Richiedi materiale al magazzino</p>
          <textarea
            value={descRichiesta}
            onChange={e => setDescRichiesta(e.target.value)}
            placeholder="Cosa ti serve? (es: 3 mt tubo corrugato ⌀20)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} />
            🚨 Urgente
          </label>
          <div className="flex gap-2">
            <button
              onClick={inviaRichiesta}
              disabled={pending || !descRichiesta.trim()}
              className="flex-1 bg-yellow-500 text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Invia richiesta
            </button>
            <button
              onClick={() => setMostraRichiesta(false)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Barra invio */}
      <div className="border-t bg-white p-3 flex gap-2 items-end">
        <button
          onClick={() => setMostraRichiesta(!mostraRichiesta)}
          className="p-2 rounded-lg border text-sm"
          title="Richiedi materiale"
        >
          📦
        </button>
        <textarea
          value={testo}
          onChange={e => setTesto(e.target.value)}
          placeholder="Scrivi un messaggio…"
          className="flex-1 border rounded-xl px-3 py-2 text-sm resize-none"
          rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inviaMessaggio() } }}
        />
        <button
          onClick={inviaMessaggio}
          disabled={pending || !testo.trim()}
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Invia
        </button>
      </div>
    </div>
  )
}
