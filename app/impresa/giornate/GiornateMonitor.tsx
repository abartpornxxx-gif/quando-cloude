'use client'

// ORDINE 1 — Il countdown è INTERNO, visibile solo all'impresa (non all'operaio)

import { useState, useEffect } from 'react'

type GiornataAttiva = {
  id: string
  operaioNome: string
  commessaNome: string
  fase: string
  inizioMattina: string | null
  fineMattina: string | null
  inizioPomeriggio: string | null
}

type Config = {
  durataMattinaMinuti: number
  durataPausaMinuti: number
  durataPomeriggioMinuti: number
}

interface Props {
  giornate: GiornataAttiva[]
  config: Config
}

function calcolaFineMs(inizio: string | null, durataMin: number): number | null {
  if (!inizio) return null
  return new Date(inizio).getTime() + durataMin * 60_000
}

function formatDurata(ms: number): string {
  if (ms <= 0) return '—'
  const sec = Math.ceil(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0
    ? `${h}h ${String(m).padStart(2, '0')}m`
    : `${m}:${String(s).padStart(2, '0')}`
}

export default function GiornateMonitor({ giornate, config }: Props) {
  const [tick, setTick] = useState(0)

  // Aggiorna ogni 30 secondi per mantenere i countdown precisi
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  if (giornate.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-gray-700 mb-2">🟢 Giornate in corso ({giornate.length})</h2>
      <div className="bg-white rounded-xl border divide-y">
        {giornate.map(g => {
          const now = Date.now()

          const fineMattinaMs    = calcolaFineMs(g.inizioMattina,   config.durataMattinaMinuti)
          const finePausaMs      = calcolaFineMs(g.fineMattina,      config.durataPausaMinuti)
          const finePomeriggioMs = calcolaFineMs(g.inizioPomeriggio, config.durataPomeriggioMinuti)

          let rimanentiMs: number | null = null
          let faseTesto = ''

          if (g.fase === 'inizio') {
            faseTesto = 'In attesa di iniziare'
          } else if (g.fase === 'mattina' && fineMattinaMs) {
            rimanentiMs = Math.max(0, fineMattinaMs - now)
            faseTesto = rimanentiMs > 0 ? `Mattina — rimanenti ${formatDurata(rimanentiMs)}` : 'Mattina completata'
          } else if (g.fase === 'pausa' && finePausaMs) {
            rimanentiMs = Math.max(0, finePausaMs - now)
            faseTesto = rimanentiMs > 0 ? `Pausa — rimanenti ${formatDurata(rimanentiMs)}` : 'Pausa terminata'
          } else if (g.fase === 'pomeriggio' && finePomeriggioMs) {
            rimanentiMs = Math.max(0, finePomeriggioMs - now)
            faseTesto = rimanentiMs > 0 ? `Pomeriggio — rimanenti ${formatDurata(rimanentiMs)}` : 'Pomeriggio completato'
          } else if (g.fase === 'fine') {
            faseTesto = '⚠️ In attesa rapportino'
          }

          const badgeColor =
            g.fase === 'fine'       ? 'bg-amber-100 text-amber-700' :
            g.fase === 'inizio'     ? 'bg-gray-100 text-gray-600'   :
            rimanentiMs === 0       ? 'bg-green-100 text-green-700' :
                                      'bg-blue-100 text-blue-700'

          return (
            <div key={g.id} className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{g.operaioNome}</p>
                <p className="text-xs text-gray-500">{g.commessaNome}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full shrink-0 font-medium ${badgeColor}`}>
                {faseTesto}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-1">Aggiornamento automatico ogni 30 secondi</p>
    </div>
  )
}
