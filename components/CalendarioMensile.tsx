'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type CalEvent = {
  date: string
  type: 'giornata' | 'pianificazione' | 'assenza'
  label: string
}

interface Props {
  anno: number
  mese: number
  events: CalEvent[]
  baseUrl: string
}

const MESI_ITA = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const GIORNI_SHORT = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

const DOT_COLORS: Record<CalEvent['type'], string> = {
  giornata: 'bg-emerald-500',
  pianificazione: 'bg-blue-500',
  assenza: 'bg-orange-400',
}

function getCalendarCells(anno: number, mese: number): Array<{ date: Date | null; currentMonth: boolean }> {
  const firstDay = new Date(anno, mese - 1, 1)
  const lastDay = new Date(anno, mese, 0)
  const firstDow = (firstDay.getDay() + 6) % 7 // 0=Mon

  const cells: Array<{ date: Date | null; currentMonth: boolean }> = []
  for (let i = 0; i < firstDow; i++) cells.push({ date: null, currentMonth: false })
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(anno, mese - 1, d), currentMonth: true })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, currentMonth: false })
  return cells
}

function prevMese(anno: number, mese: number) {
  return mese === 1 ? { anno: anno - 1, mese: 12 } : { anno, mese: mese - 1 }
}
function nextMese(anno: number, mese: number) {
  return mese === 12 ? { anno: anno + 1, mese: 1 } : { anno, mese: mese + 1 }
}

export function CalendarioMensile({ anno, mese, events, baseUrl }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const cells = getCalendarCells(anno, mese)

  const eventsByDate = events.reduce<Record<string, CalEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  function navigate(dir: 'prev' | 'next') {
    const { anno: a, mese: m } = dir === 'prev' ? prevMese(anno, mese) : nextMese(anno, mese)
    router.push(`${baseUrl}?anno=${a}&mese=${m}`)
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  return (
    <div className="space-y-4">
      {/* Header mese */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('prev')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          ←
        </button>
        <h2 className="flex-1 text-center text-base font-semibold text-gray-900">
          {MESI_ITA[mese - 1]} {anno}
        </h2>
        <button onClick={() => navigate('next')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          →
        </button>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Giornata</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Pianificazione</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" />Assenza</span>
      </div>

      {/* Griglia calendario */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Intestazioni giorni */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {GIORNI_SHORT.map(g => (
            <div key={g} className="py-2 text-center text-xs font-semibold text-gray-500">{g}</div>
          ))}
        </div>

        {/* Celle */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (!cell.date) {
              return <div key={`empty-${idx}`} className="border-b border-r last:border-r-0 border-gray-100 h-16 bg-gray-50/40" />
            }
            const dateStr = cell.date.toISOString().slice(0, 10)
            const dayEvents = eventsByDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-start border-b border-r last:border-r-0 border-gray-100 p-1.5 h-16 text-left transition-colors hover:bg-blue-50 ${
                  isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-400' : ''
                } ${!cell.currentMonth ? 'opacity-30' : ''}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[e.type]}`} title={e.label} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-gray-400">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pannello dettaglio giorno selezionato */}
      {selectedDate && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">Nessun evento per questo giorno</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_COLORS[e.type]}`} />
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase mr-2">
                      {e.type === 'giornata' ? 'Giornata' : e.type === 'pianificazione' ? 'Pianificato' : 'Assenza'}
                    </span>
                    <span className="text-sm text-gray-700">{e.label}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
