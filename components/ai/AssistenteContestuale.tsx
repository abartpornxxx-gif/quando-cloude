'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Bot, ChevronDown } from 'lucide-react'
import { AiActionConfirmPanel } from './AiActionConfirmPanel'
import type { ActionDraft } from '@/lib/ai/actions/types'

interface Props {
  role: 'impresa' | 'ufficio' | 'operaio' | 'magazziniere' | 'cliente' | 'libero'
}

const SUGGESTIONS: Record<string, string[]> = {
  impresa: [
    'Cosa devo fare oggi?',
    'Crea promemoria per domani mattina',
    'Segnala materiale mancante in cantiere',
    'Cosa manca in questa commessa?',
  ],
  ufficio: [
    'Riassumi questa commessa',
    'Crea un promemoria urgente',
    'Prepara bozza email cliente',
    'Controlla varianti e preventivi',
  ],
  operaio: [
    'Cosa devo fare oggi?',
    'Aiutami a scrivere il rapportino',
    'Segnala materiale mancante',
    'Spiega le istruzioni del cantiere',
  ],
  magazziniere: [
    'Cosa devo preparare oggi?',
    'Richieste materiali urgenti',
    'Segnala materiale esaurito',
    'Come evado una richiesta?',
  ],
  cliente: [
    'Spiegami lo stato dei miei lavori',
    'Quando finiscono i lavori?',
    'Spiega questa variante',
    'Come effettuo un pagamento?',
  ],
  libero: [
    'Cosa devo fare oggi?',
    'Riassumi i miei interventi aperti',
    'Come creo un preventivo?',
    'Spiega la situazione clienti',
  ],
}

const COLORS = {
  impresa:     { fab: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',       header: 'bg-blue-700',     user: 'bg-blue-600',     ring: 'ring-blue-500',    dot: 'bg-blue-500',    btn: 'bg-blue-600 hover:bg-blue-700',    sugg: 'hover:border-blue-400 hover:text-blue-700',    accent: 'blue'    },
  ufficio:     { fab: 'bg-teal-600 hover:bg-teal-700 shadow-teal-200',       header: 'bg-teal-700',     user: 'bg-teal-600',     ring: 'ring-teal-500',    dot: 'bg-teal-500',    btn: 'bg-teal-600 hover:bg-teal-700',    sugg: 'hover:border-teal-400 hover:text-teal-700',    accent: 'teal'    },
  operaio:     { fab: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200', header: 'bg-emerald-700', user: 'bg-emerald-600', ring: 'ring-emerald-500', dot: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', sugg: 'hover:border-emerald-400 hover:text-emerald-700', accent: 'emerald' },
  magazziniere:{ fab: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',    header: 'bg-amber-700',    user: 'bg-amber-600',    ring: 'ring-amber-500',   dot: 'bg-amber-500',   btn: 'bg-amber-600 hover:bg-amber-700',   sugg: 'hover:border-amber-400 hover:text-amber-700',   accent: 'amber'   },
  cliente:     { fab: 'bg-violet-600 hover:bg-violet-700 shadow-violet-200', header: 'bg-violet-700',   user: 'bg-violet-600',   ring: 'ring-violet-500',  dot: 'bg-violet-500',  btn: 'bg-violet-600 hover:bg-violet-700', sugg: 'hover:border-violet-400 hover:text-violet-700', accent: 'violet'  },
  libero:      { fab: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200', header: 'bg-orange-700',   user: 'bg-orange-600',   ring: 'ring-orange-500',  dot: 'bg-orange-500',  btn: 'bg-orange-600 hover:bg-orange-700', sugg: 'hover:border-orange-400 hover:text-orange-700', accent: 'orange'  },
}

// Parole chiave che indicano intenzione di eseguire un'azione
const ACTION_KEYWORDS = [
  'crea', 'prepara', 'aggiungi', 'segnala', 'richiedi', 'pianifica',
  'ricordami', 'promemoria', 'bozza', 'rapportino', 'mancante', 'mancano',
  'ordina', 'follow-up', 'followup', 'richiama', 'chiama',
  'registra', 'completa', 'segna', 'rimanda', 'sposta',
]

function isActionIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return ACTION_KEYWORDS.some(kw => lower.includes(kw))
}

// Estrae commessaId dall'URL se presente
function extractCommessaId(pathname: string): string | undefined {
  const m = pathname.match(/\/commesse\/([a-z0-9-]+)/i)
  return m?.[1]
}

interface Message {
  sender: 'user' | 'assistant' | 'error'
  text: string
  drafts?: ActionDraft[]
}

export function AssistenteContestuale({ role }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen]   = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const c = COLORS[role]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    setMessages([])
    setInput('')
  }, [pathname])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    const userMsg = text.trim()
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      // 1. Se il messaggio sembra un'azione, prova prima il prepare
      if (isActionIntent(userMsg) && role !== 'cliente') {
        const commessaId = extractCommessaId(pathname)
        const prepRes = await fetch('/api/ai/actions/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: userMsg, pathname, commessaId }),
        })
        if (prepRes.ok) {
          const prepData = await prepRes.json()
          if (prepData.intento === 'azione' && Array.isArray(prepData.drafts) && prepData.drafts.length > 0) {
            const count = prepData.drafts.length
            setMessages(prev => [...prev, {
              sender: 'assistant',
              text: count === 1
                ? `Ho preparato una bozza. Controlla i dettagli e conferma per salvare.`
                : `Ho preparato ${count} bozze. Controlla e conferma quelle che vuoi salvare.`,
              drafts: prepData.drafts,
            }])
            setIsLoading(false)
            return
          }
        }
      }

      // 2. Fallback: chat AI normale
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname, message: userMsg }),
      })
      const data = await res.json()

      if (data.notConfigured || data.notAvailable) {
        setMessages(prev => [...prev, { sender: 'error', text: 'Assistente momentaneamente non disponibile. Riprova tra qualche secondo.' }])
      } else if (data.rateLimited) {
        setMessages(prev => [...prev, { sender: 'error', text: 'Troppe richieste in poco tempo. Aspetta un minuto e riprova.' }])
      } else if (data.response) {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.response }])
      } else {
        setMessages(prev => [...prev, { sender: 'error', text: data.error || 'Errore nella risposta. Riprova.' }])
      }
    } catch {
      setMessages(prev => [...prev, { sender: 'error', text: 'Errore di connessione. Controlla la rete e riprova.' }])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, pathname, role])

  const suggestions = SUGGESTIONS[role] || []
  const showSuggestions = messages.length === 0
  const fabBottom = role === 'operaio' ? 'bottom-20 sm:bottom-6' : 'bottom-4 sm:bottom-6'

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${fabBottom} right-4 sm:right-6 z-40 flex h-12 w-12 sm:h-auto sm:w-auto items-center justify-center gap-2 rounded-full sm:rounded-2xl px-0 sm:px-4 sm:py-2.5 text-sm font-semibold text-white shadow-xl ${c.fab} active:scale-95 transition-all`}
          aria-label="Apri Assistente AI"
        >
          <Sparkles size={18} className="shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">AI</span>
        </button>
      )}

      {/* Pannello chat */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end pointer-events-none">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="relative pointer-events-auto flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:mr-6 sm:mb-6 overflow-hidden"
            style={{ height: 'min(650px, 88dvh)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 text-white shrink-0 ${c.header}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">QUADRO AI</p>
                  <p className="text-[10px] opacity-70 leading-tight">Capisce · Prepara · Conferma · Salva</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 hover:bg-white/20 transition-colors"
                aria-label="Chiudi"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Messaggi */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${c.header} text-white shadow-lg`}>
                    <Sparkles size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Ciao! Sono QUADRO AI.</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    Posso preparare bozze di promemoria, rapportini e segnalazioni. Tu controlli e confermi.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="space-y-3">
                  <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender !== 'user' && (
                      <div className={`mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${c.header} text-white`}>
                        <Bot size={12} />
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? `${c.user} text-white rounded-tr-none`
                        : msg.sender === 'error'
                          ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-none'
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                  {/* Draft cards inline */}
                  {msg.drafts && msg.drafts.length > 0 && (
                    <div className="pl-8">
                      <AiActionConfirmPanel
                        drafts={msg.drafts}
                        accentColor={c.accent}
                      />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className={`mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${c.header} text-white`}>
                    <Bot size={12} />
                  </div>
                  <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-bounce`} style={{ animationDelay: '0ms' }} />
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-bounce`} style={{ animationDelay: '150ms' }} />
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-bounce`} style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggerimenti rapidi */}
            {showSuggestions && (
              <div className="px-4 pb-2 shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Suggerimenti</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      disabled={isLoading}
                      className={`rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition-colors disabled:opacity-50 text-left ${c.sugg}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-100 px-3 py-2.5 bg-white shrink-0">
              <form
                onSubmit={e => { e.preventDefault(); sendMessage(input) }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="Chiedi o di' cosa vuoi fare…"
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-gray-300 disabled:text-gray-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 transition-all ${c.btn}`}
                  aria-label="Invia"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
