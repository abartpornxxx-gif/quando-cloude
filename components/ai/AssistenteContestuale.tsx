'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Bot, MessageSquare } from 'lucide-react'

interface Props {
  role: 'impresa' | 'ufficio' | 'operaio' | 'magazziniere' | 'cliente'
}

const SUGGESTIONS: Record<string, string[]> = {
  impresa: [
    'Riassumi situazione aziendale',
    'Mostra criticità',
    'Spiega margini e scadenze',
    'Quali commesse richiedono attenzione?'
  ],
  ufficio: [
    'Riassumi questa commessa',
    'Prepara messaggio cliente',
    'Spiega fatture e incassi',
    'Controlla varianti e preventivi fornitori'
  ],
  operaio: [
    'Spiegami cosa devo fare',
    'Migliora le note del rapportino',
    'Segnala materiale mancante',
    'Scrivi testo professionale'
  ],
  magazziniere: [
    'Riassumi richieste materiali',
    'Cosa devo preparare?',
    'Mostra priorità',
    'Segnala mancanze'
  ],
  cliente: [
    'Spiegami lo stato lavori',
    'Riassumi avanzamento',
    'Spiega questa variante',
    'Cosa manca?'
  ]
}

const ROLE_COLORS: Record<Props['role'], {
  fab: string
  header: string
  closeBtn: string
  userBubble: string
  inputFocus: string
  sendBtn: string
  iconBg: string
  iconColor: string
  suggHover: string
  suggText: string
}> = {
  impresa: {
    fab: 'bg-blue-600 hover:bg-blue-700',
    header: 'bg-blue-700',
    closeBtn: 'text-blue-100 hover:bg-blue-600',
    userBubble: 'bg-blue-600',
    inputFocus: 'focus:border-blue-500',
    sendBtn: 'bg-blue-600 hover:bg-blue-700',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    suggHover: 'hover:border-blue-500',
    suggText: 'hover:text-blue-600',
  },
  ufficio: {
    fab: 'bg-teal-600 hover:bg-teal-700',
    header: 'bg-teal-700',
    closeBtn: 'text-teal-100 hover:bg-teal-600',
    userBubble: 'bg-teal-600',
    inputFocus: 'focus:border-teal-500',
    sendBtn: 'bg-teal-600 hover:bg-teal-700',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    suggHover: 'hover:border-teal-500',
    suggText: 'hover:text-teal-600',
  },
  operaio: {
    fab: 'bg-emerald-600 hover:bg-emerald-700',
    header: 'bg-emerald-700',
    closeBtn: 'text-emerald-100 hover:bg-emerald-600',
    userBubble: 'bg-emerald-600',
    inputFocus: 'focus:border-emerald-500',
    sendBtn: 'bg-emerald-600 hover:bg-emerald-700',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    suggHover: 'hover:border-emerald-500',
    suggText: 'hover:text-emerald-600',
  },
  magazziniere: {
    fab: 'bg-amber-600 hover:bg-amber-700',
    header: 'bg-amber-700',
    closeBtn: 'text-amber-100 hover:bg-amber-600',
    userBubble: 'bg-amber-600',
    inputFocus: 'focus:border-amber-500',
    sendBtn: 'bg-amber-600 hover:bg-amber-700',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    suggHover: 'hover:border-amber-500',
    suggText: 'hover:text-amber-600',
  },
  cliente: {
    fab: 'bg-violet-600 hover:bg-violet-700',
    header: 'bg-violet-700',
    closeBtn: 'text-violet-100 hover:bg-violet-600',
    userBubble: 'bg-violet-600',
    inputFocus: 'focus:border-violet-500',
    sendBtn: 'bg-violet-600 hover:bg-violet-700',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    suggHover: 'hover:border-violet-500',
    suggText: 'hover:text-violet-600',
  },
}

interface Message {
  sender: 'user' | 'assistant'
  text: string
}

export function AssistenteContestuale({ role }: Props) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const c = ROLE_COLORS[role]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([])
    setNotConfigured(false)
  }, [pathname])

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const userMsg = textToSend.trim()
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pathname,
          message: userMsg
        })
      })

      const data = await res.json()
      if (data.notConfigured) {
        setNotConfigured(true)
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: 'Assistente AI non ancora configurato. Inserire chiave API nell\'ambiente server.'
        }])
      } else if (data.response) {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.response }])
      } else {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: data.error || 'Errore nella risposta del server.'
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'Errore di connessione. Riprova più tardi.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = SUGGESTIONS[role] || []

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[80px] right-4 sm:bottom-6 sm:right-6 z-40 flex h-12 w-12 sm:h-auto sm:w-auto items-center justify-center gap-2 rounded-full p-0 sm:px-4 sm:py-3 text-sm font-semibold text-white shadow-xl active:scale-95 transition-all cursor-pointer shrink-0 ${c.fab}`}
        aria-label="Apri Assistente AI"
      >
        <Sparkles size={16} className="animate-pulse shrink-0" />
        <span className="hidden sm:inline">Assistente AI</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300">
            <div className={`flex items-center justify-between border-b border-gray-200 p-4 text-white ${c.header}`}>
              <div className="flex items-center gap-2">
                <Bot size={20} className="opacity-80" />
                <div>
                  <h3 className="text-sm font-bold leading-tight">Assistente AI</h3>
                  <p className="text-[10px] opacity-75 leading-tight">Aiuto contestuale per questa schermata</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`rounded-lg p-1 transition-colors cursor-pointer ${c.closeBtn}`}
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${c.iconBg} ${c.iconColor}`}>
                    <MessageSquare size={24} />
                  </div>
                  <div className="max-w-xs mx-auto space-y-1">
                    <p className="text-xs font-bold text-gray-700">Ciao! Sono il tuo assistente QUADRO.</p>
                    <p className="text-[11px] text-gray-500">Posso riassumere i dati o darti suggerimenti utili per la pagina che stai guardando.</p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                    msg.sender === 'user'
                      ? `${c.userBubble} text-white rounded-tr-none`
                      : notConfigured
                        ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-none'
                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {suggestions.length > 0 && !notConfigured && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggerimenti rapidi</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s)}
                      disabled={isLoading}
                      className={`rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer text-left ${c.suggHover} ${c.suggText}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 p-3 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage(input)
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || notConfigured}
                  placeholder={notConfigured ? 'Assistente disabilitato' : 'Chiedi qualcosa...'}
                  className={`flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 ${c.inputFocus}`}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || notConfigured}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-white active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 transition-all cursor-pointer shrink-0 ${c.sendBtn}`}
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
