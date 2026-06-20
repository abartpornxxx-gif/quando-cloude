'use client'

// ORDINE 1 — Il countdown è INTERNO, visibile solo all'impresa (non all'operaio)

import { useState, useEffect } from 'react'

type GiornataAttiva = {
  id: string
  operaioNome: string
  commessaNome: string
  commessaIndirizzo?: string | null
  fase: string
  inizioMattina: string | null
  fineMattina: string | null
  inizioPomeriggio: string | null
  hasProblema?: boolean
  hasUrgenza?: boolean
}

type Config = {
  durataMattinaMinuti: number
  durataPausaMinuti: number
  durataPomeriggioMinuti: number
}

function formatMs(ms: number): string {
  if (ms <= 0) return '0m'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function initials(nome: string): string {
  return nome.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600',
  'bg-teal-600', 'bg-indigo-600', 'bg-pink-600', 'bg-orange-600',
]
function avatarColor(id: string): string {
  return AVATAR_COLORS[parseInt(id.slice(-2), 16) % AVATAR_COLORS.length]
}

export default function GiornateMonitor({
  giornate,
}: {
  giornate: GiornataAttiva[]
  config: Config
}) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  if (giornate.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center">
        <p className="text-2xl mb-2">😴</p>
        <p className="text-sm font-medium text-gray-500">Nessun operaio in cantiere adesso</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
      {giornate.map(g => {
        const now = Date.now()

        const mattinaMs = g.inizioMattina
          ? (g.fineMattina
            ? new Date(g.fineMattina).getTime() - new Date(g.inizioMattina).getTime()
            : g.fase === 'mattina' ? now - new Date(g.inizioMattina).getTime() : 0)
          : 0
        const pomeriggioMs = g.inizioPomeriggio && g.fase === 'pomeriggio'
          ? now - new Date(g.inizioPomeriggio).getTime()
          : 0
        const totaleMs = mattinaMs + pomeriggioMs

        const faseBadge =
          g.fase === 'inizio'     ? { label: 'Attesa avvio',  cls: 'bg-gray-100 text-gray-600' }
          : g.fase === 'mattina'    ? { label: 'In lavoro',     cls: 'bg-emerald-100 text-emerald-700' }
          : g.fase === 'pausa'      ? { label: 'Pausa',         cls: 'bg-amber-100 text-amber-700' }
          : g.fase === 'pomeriggio' ? { label: 'In lavoro',     cls: 'bg-emerald-100 text-emerald-700' }
          : g.fase === 'fine'       ? { label: 'Rapportino',    cls: 'bg-orange-100 text-orange-700' }
          : { label: g.fase, cls: 'bg-gray-100 text-gray-600' }

        return (
          <div key={g.id} className="px-5 py-4">
            <div className="flex items-center gap-4">
              <div className={`shrink-0 h-10 w-10 rounded-full ${avatarColor(g.id)} text-white text-sm font-bold flex items-center justify-center select-none`}>
                {initials(g.operaioNome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{g.operaioNome}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${faseBadge.cls}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {faseBadge.label}
                  </span>
                  {g.hasProblema && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">
                      ⚠️ Problema segnalato
                    </span>
                  )}
                  {g.hasUrgenza && !g.hasProblema && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-semibold">
                      🔴 Urgenza alta
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5 truncate">{g.commessaNome}</p>
                {g.commessaIndirizzo && (
                  <p className="text-xs text-gray-400 truncate">{g.commessaIndirizzo}</p>
                )}
              </div>
              <div className="shrink-0 text-right space-y-1.5">
                {totaleMs > 60_000 && (
                  <p className="text-sm font-bold text-gray-800">{formatMs(totaleMs)}</p>
                )}
                <div className="flex items-center gap-3 justify-end">
                  <a
                    href={`/impresa/giornate/${g.id}/chat`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    💬 Chat
                  </a>
                  {g.fase === 'fine' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-semibold">
                      📋 In compilazione
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <div className="bg-gray-50 px-5 py-2 text-xs text-gray-400">
        Aggiornamento automatico ogni 30 secondi
      </div>
    </div>
  )
}
