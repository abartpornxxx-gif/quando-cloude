'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Bot, ChevronDown } from 'lucide-react'

interface Props {
  role: 'impresa' | 'ufficio' | 'operaio' | 'magazziniere' | 'cliente' | 'libero'
}

const SUGGESTIONS: Record<string, string[]> = {
  impresa: [
    'Riassumi la situazione aziendale',
    'Quali commesse richiedono attenzione?',
    'Analizza margini e scadenze',
    'Cosa devo fare oggi?',
  ],
  ufficio: [
    'Riassumi questa commessa',
    'Spiega fatture e incassi',
    'Prepara bozza email cliente',
    'Controlla varianti e preventivi',
  ],
  operaio: [
    'Cosa devo fare oggi?',
    'Aiutami a scrivere il rapportino',
    'Spiega le istruzioni del cantiere',
    'Come segnalo materiale mancante?',
  ],
  magazziniere: [
    'Cosa devo preparare oggi?',
    'Richieste materiali urgenti',
    'Mostra le priorità',
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
  impresa:    { fab: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',    header: 'bg-blue-700',    user: 'bg-blue-600',    ring: 'ring-blue-500', dot: 'bg-blue-500',    btn: 'bg-blue-600 hover:bg-blue-700',    sugg: 'hover:border-blue-400 hover:text-blue-700' },
  ufficio:    { fab: 'bg-teal-600 hover:bg-teal-700 shadow-teal-200',    header: 'bg-teal-700',    user: 'bg-teal-600',    ring: 'ring-teal-500',  dot: 'bg-teal-500',    btn: 'bg-teal-600 hover:bg-teal-700',    sugg: 'hover:border-teal-400 hover:text-teal-700' },
  operaio:    { fab: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200', header: 'bg-emerald-700', user: 'bg-emerald-600', ring: 'ring-emerald-500', dot: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', sugg: 'hover:border-emerald-400 hover:text-emerald-700' },
  magazziniere: { fab: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200', header: 'bg-amber-700', user: 'bg-amber-600', ring: 'ring-amber-500', dot: 'bg-amber-500', btn: 'bg-amber-600 hover:bg-amber-700', sugg: 'hover:border-amber-400 hover:text-amber-700' },
  cliente:    { fab: 'bg-violet-600 hover:bg-violet-700 shadow-violet-200', header: 'bg-violet-700', user: 'bg-violet-600', ring: 'ring-violet-500', dot: 'bg-violet-500', btn: 'bg-violet-600 hover:bg-violet-700', sugg: 'hover:border-violet-400 hover:text-violet-700' },
  libero:     { fab: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200', header: 'bg-orange-700', user: 'bg-orange-600', ring: 'ring-orange-500', dot: 'bg-orange-500', btn: 'bg-orange-600 hover:bg-orange-700', sugg: 'hover:border-orange-400 hover:text-orange-700' },
}

interface Message {
  sender: 'user' | 'assistant' | 'error'
  text: string
}

export function AssistenteContestuale({ role }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [disabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const c = COLORS[role]

  // Scorri in fondo a ogni nuovo messaggio
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Reset quando cambia pagina
  useEffect(() => {
    setMessages([])
    setInput('')
  }, [pathname])

  // Focus input quando si apre
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  // Chiudi con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || disabled) return

    const userMsg = text.trim()
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname, message: userMsg }),
      })

      const data = await res.json()

      if (data.notConfigured || data.notAvailable) {
        setMessages(prev => [...prev, {
          sender: 'error',
          text: '⏳ Assistente momentaneamente non disponibile. Riprova tra qualche secondo.',
        }])
      } else if (data.rateLimited) {
        setMessages(prev => [...prev, {
          sender: 'error',
          text: '⏱️ Troppe richieste in poco tempo. Aspetta un minuto e riprova.',
        }])
      } else if (data.response) {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.response }])
      } else {
        setMessages(prev => [...prev, {
          sender: 'error',
          text: data.error || '❌ Errore nella risposta. Riprova tra qualche secondo.',
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        sender: 'error',
        text: '❌ Errore di connessione. Controlla la rete e riprova.',
      }])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, disabled, pathname])

  const suggestions = SUGGESTIONS[role] || []
  // Mostra i suggerimenti solo quando la chat è vuota e l'AI è funzionante
  const showSuggestions = messages.length === 0 && !disabled

  // Posizione FAB: su operaio c'è la bottom nav (h=~64px), quindi più in alto
  const fabBottom = role === 'operaio'
    ? 'bottom-20 sm:bottom-6'
    : 'bottom-4 sm:bottom-6'

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
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat panel */}
          <div className="relative pointer-events-auto flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-[400px] sm:max-w-[calc(100vw-2rem)] sm:mr-6 sm:mb-6 overflow-hidden"
            style={{ height: 'min(600px, 85dvh)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 text-white shrink-0 ${c.header}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">Assistente AI</p>
                  <p className="text-[10px] opacity-70 leading-tight">Aiuto contestuale — QUADRO</p>
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
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Benvenuto */}
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${c.header} text-white shadow-lg`}>
                    <Sparkles size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Ciao! Sono il tuo assistente QUADRO.</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    Posso aiutarti con la pagina che stai usando. Fai una domanda o usa i suggerimenti qui sotto.
                  </p>
                </div>
              )}

              {/* Messaggi */}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
              ))}

              {/* Typing indicator */}
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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Suggerimenti rapidi</p>
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
                  disabled={isLoading || disabled}
                  placeholder={disabled ? 'Assistente non disponibile' : 'Chiedi qualcosa…'}
                  className={`flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-gray-300 disabled:text-gray-400 disabled:bg-gray-50 transition-colors`}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || disabled}
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
