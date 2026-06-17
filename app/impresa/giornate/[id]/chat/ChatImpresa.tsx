'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { inviaMsgImpresa, getMessaggiImpresa } from './actions'

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

export default function ChatImpresa({ giornataId, messaggi: messaggiIniziali }: Props) {
  const [messaggi, setMessaggi] = useState<Messaggio[]>(messaggiIniziali)
  const [testo, setTesto] = useState('')
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const nuovi = await getMessaggiImpresa(giornataId)
        setMessaggi(nuovi as Messaggio[])
      } catch {}
    }, 30_000)
    return () => clearInterval(poll)
  }, [giornataId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  function invia() {
    if (!testo.trim()) return
    startTransition(async () => {
      try {
        await inviaMsgImpresa(giornataId, testo)
        setTesto('')
        const nuovi = await getMessaggiImpresa(giornataId)
        setMessaggi(nuovi as Messaggio[])
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  const colore: Record<string, string> = {
    impresa: 'bg-blue-600 text-white rounded-tr-none',
    operaio: 'bg-gray-100 text-gray-800 rounded-tl-none',
    magazziniere: 'bg-yellow-100 text-gray-800 rounded-tl-none border border-yellow-200',
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messaggi.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">Nessun messaggio ancora</p>
        )}
        {messaggi.map(m => (
          <div
            key={m.id}
            className={`flex ${m.ruolo === 'impresa' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${colore[m.ruolo] ?? 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
              <p className="text-xs opacity-70 mb-1">{m.autoreNome}</p>
              {m.testo && <p>{m.testo}</p>}
              {m.fotoUrl && <img src={m.fotoUrl} alt="foto" className="mt-1 rounded-lg max-w-full" />}
              <p className="text-xs opacity-50 mt-1 text-right">
                {new Date(m.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {errore && <p className="text-red-600 text-xs text-center px-4 py-1">{errore}</p>}

      <div className="border-t bg-white p-3 flex gap-2 items-end">
        <textarea
          value={testo}
          onChange={e => setTesto(e.target.value)}
          placeholder="Scrivi un messaggio all'operaio…"
          className="flex-1 border rounded-xl px-3 py-2 text-sm resize-none"
          rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
        />
        <button
          onClick={invia}
          disabled={pending || !testo.trim()}
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? '…' : 'Invia'}
        </button>
      </div>
    </div>
  )
}
