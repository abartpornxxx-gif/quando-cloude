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

const SCORCIATOIE = [
  'Ricevuto ✓',
  'Arrivo tra 10 minuti',
  'Mando il materiale oggi',
  'Chiamami quando puoi',
  'Ottimo lavoro!',
  'Attenzione: verifica la sicurezza',
  'Procedi pure',
  'Aspetta prima di continuare',
]

const RUOLO_CONFIG: Record<string, { label: string; bg: string; text: string; align: 'end' | 'start'; bubble: string }> = {
  impresa:      { label: 'Impresa',     bg: 'bg-blue-600',    text: 'text-white',     align: 'end',   bubble: 'rounded-2xl rounded-tr-sm' },
  operaio:      { label: 'Operaio',     bg: 'bg-white',       text: 'text-gray-800',  align: 'start', bubble: 'rounded-2xl rounded-tl-sm border border-gray-200' },
  magazziniere: { label: 'Magazziniere', bg: 'bg-amber-50',   text: 'text-gray-800',  align: 'start', bubble: 'rounded-2xl rounded-tl-sm border border-amber-200' },
}

export default function ChatImpresa({ giornataId, messaggi: messaggiIniziali }: Props) {
  const [messaggi, setMessaggi] = useState<Messaggio[]>(messaggiIniziali)
  const [testo, setTesto] = useState('')
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')
  const [mostraScorciatoie, setMostraScorciatoie] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  function invia(testoOverride?: string) {
    const msg = (testoOverride ?? testo).trim()
    if (!msg) return
    startTransition(async () => {
      try {
        await inviaMsgImpresa(giornataId, msg)
        if (!testoOverride) setTesto('')
        setMostraScorciatoie(false)
        const nuovi = await getMessaggiImpresa(giornataId)
        setMessaggi(nuovi as Messaggio[])
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  function usaScorciatoia(s: string) {
    invia(s)
  }

  function formatOra(d: Date | string) {
    return new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  function formatData(d: Date | string) {
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  }

  // Raggruppa messaggi per giorno
  const messaggiConData: Array<{ tipo: 'data'; label: string } | { tipo: 'msg'; m: Messaggio }> = []
  let ultimaData = ''
  for (const m of messaggi) {
    const data = new Date(m.createdAt).toDateString()
    if (data !== ultimaData) {
      messaggiConData.push({ tipo: 'data', label: formatData(m.createdAt) })
      ultimaData = data
    }
    messaggiConData.push({ tipo: 'msg', m })
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 116px)' }}>
      {/* Lista messaggi */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50">
        {messaggi.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm text-gray-500 font-medium">Nessun messaggio</p>
            <p className="text-xs text-gray-400 mt-1">Scrivi il primo messaggio all&apos;operaio</p>
          </div>
        )}
        {messaggiConData.map((item, idx) => {
          if (item.tipo === 'data') {
            return (
              <div key={`data-${idx}`} className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )
          }
          const { m } = item
          const cfg = RUOLO_CONFIG[m.ruolo] ?? RUOLO_CONFIG.operaio
          const isImpresa = m.ruolo === 'impresa'

          return (
            <div key={m.id} className={`flex ${isImpresa ? 'justify-end' : 'justify-start'} mb-1`}>
              <div className={`max-w-[78%] ${isImpresa ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Nome mittente */}
                <div className={`flex items-center gap-1.5 mb-1 ${isImpresa ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[11px] font-semibold text-gray-500">{m.autoreNome}</span>
                  {!isImpresa && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {cfg.label}
                    </span>
                  )}
                </div>
                {/* Bolla */}
                <div className={`px-3.5 py-2.5 ${cfg.bubble} ${cfg.bg} ${cfg.text} shadow-sm`}>
                  {m.testo && <p className="text-sm leading-snug whitespace-pre-wrap">{m.testo}</p>}
                  {m.fotoUrl && (
                    <img src={m.fotoUrl} alt="foto" className="mt-1.5 rounded-xl max-w-full max-h-48 object-cover" />
                  )}
                  <p className={`text-[10px] mt-1 ${isImpresa ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                    {formatOra(m.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scorciatoie */}
      {mostraScorciatoie && (
        <div className="bg-white border-t border-gray-200 px-3 py-2.5">
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Messaggi rapidi</p>
          <div className="flex flex-wrap gap-2">
            {SCORCIATOIE.map(s => (
              <button
                key={s}
                onClick={() => usaScorciatoia(s)}
                disabled={pending}
                className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {errore && <p className="text-red-600 text-xs text-center px-4 py-1 bg-red-50">{errore}</p>}

      {/* Input area */}
      <div className="border-t bg-white px-3 py-2.5 flex gap-2 items-end">
        <button
          type="button"
          onClick={() => setMostraScorciatoie(v => !v)}
          className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-xl border transition-colors ${
            mostraScorciatoie ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
          title="Messaggi rapidi"
        >
          ⚡
        </button>
        <textarea
          ref={textareaRef}
          value={testo}
          onChange={e => setTesto(e.target.value)}
          placeholder="Scrivi un messaggio…"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={1}
          style={{ maxHeight: '120px' }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
        />
        <button
          onClick={() => invia()}
          disabled={pending || !testo.trim()}
          className="shrink-0 h-9 w-16 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {pending ? '…' : 'Invia'}
        </button>
      </div>
    </div>
  )
}
