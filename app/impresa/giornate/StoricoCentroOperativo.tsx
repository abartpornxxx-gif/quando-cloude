'use client'

import { useState, useMemo } from 'react'

type GiornataChiusa = {
  id: string
  operaioId: string
  commessaId: string
  operaioNome: string
  commessaNome: string
  data: string
  hasRapportino: boolean
  lavoroEseguito: string | null
  cosaFareDomani: string | null
  ore: number
  oreStr: number
  fotoUrl: string | null
}

type Props = {
  giornate: GiornataChiusa[]
  operai: { id: string; nome: string }[]
  commesse: { id: string; nome: string }[]
}

type Periodo = 'oggi' | 'settimana' | 'mese' | 'tutto'

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return monday
}

export default function StoricoCentroOperativo({ giornate, operai, commesse }: Props) {
  const [filtroOperaio, setFiltroOperaio] = useState('')
  const [filtroCommessa, setFiltroCommessa] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<Periodo>('tutto')

  const filtered = useMemo(() => {
    const ora = new Date()
    const inizioOggi = startOfDay(ora)
    const inizioSettimana = startOfWeek(ora)
    const inizioMese = new Date(ora.getFullYear(), ora.getMonth(), 1)

    return giornate.filter(g => {
      if (filtroOperaio && g.operaioId !== filtroOperaio) return false
      if (filtroCommessa && g.commessaId !== filtroCommessa) return false
      if (filtroPeriodo !== 'tutto') {
        const gData = startOfDay(new Date(g.data))
        if (filtroPeriodo === 'oggi' && gData.getTime() !== inizioOggi.getTime()) return false
        if (filtroPeriodo === 'settimana' && gData < inizioSettimana) return false
        if (filtroPeriodo === 'mese' && gData < inizioMese) return false
      }
      return true
    })
  }, [giornate, filtroOperaio, filtroCommessa, filtroPeriodo])

  const perData = useMemo(() => {
    const groups: Record<string, GiornataChiusa[]> = {}
    for (const g of filtered) {
      const k = new Date(g.data).toLocaleDateString('it-IT')
      if (!groups[k]) groups[k] = []
      groups[k].push(g)
    }
    return groups
  }, [filtered])

  const dateKeys = Object.keys(perData)

  const periodoLabels: Record<Periodo, string> = {
    oggi: 'Oggi',
    settimana: 'Settimana',
    mese: 'Mese',
    tutto: 'Tutto',
  }

  return (
    <div className="space-y-4">
      {/* Filtri */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filtroOperaio}
          onChange={e => setFiltroOperaio(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Tutti gli operai</option>
          {operai.map(o => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>

        <select
          value={filtroCommessa}
          onChange={e => setFiltroCommessa(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Tutte le commesse</option>
          {commesse.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
          {(['oggi', 'settimana', 'mese', 'tutto'] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => setFiltroPeriodo(p)}
              className={[
                'px-3 py-2 text-xs font-semibold transition-colors',
                filtroPeriodo === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {periodoLabels[p]}
            </button>
          ))}
        </div>

        {(filtroOperaio || filtroCommessa || filtroPeriodo !== 'tutto') && (
          <button
            onClick={() => { setFiltroOperaio(''); setFiltroCommessa(''); setFiltroPeriodo('tutto') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Azzera filtri
          </button>
        )}
      </div>

      {/* Lista raggruppata per data */}
      {dateKeys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center">
          <p className="text-sm text-gray-400">Nessuna giornata trovata con i filtri selezionati.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dateKeys.map(data => (
            <div key={data}>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                📅 {data}
              </p>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
                {perData[data].map(g => (
                  <div key={g.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900">{g.operaioNome}</p>
                          {g.hasRapportino ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              ✓ Rapportino
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Rapportino mancante
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{g.commessaNome}</p>
                        {g.lavoroEseguito && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
                            {g.lavoroEseguito}
                          </p>
                        )}
                        {g.cosaFareDomani && (
                          <p className="text-xs text-blue-600 mt-1.5">
                            📝 Domani: {g.cosaFareDomani}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-1.5">
                        {g.ore > 0 && (
                          <p className="text-xs font-medium text-gray-700">{g.ore}h ord.</p>
                        )}
                        {g.oreStr > 0 && (
                          <p className="text-xs font-medium text-orange-600">{g.oreStr}h str.</p>
                        )}
                        {g.fotoUrl && (
                          <img
                            src={g.fotoUrl}
                            alt="foto cantiere"
                            className="w-12 h-12 object-cover rounded-xl border border-gray-200 mt-1 ml-auto"
                          />
                        )}
                        {g.hasRapportino && (
                          <a
                            href={`/impresa/giornate/${g.id}/rapportino`}
                            className="inline-block text-xs font-medium text-emerald-600 hover:text-emerald-800"
                          >
                            📋 Rapportino
                          </a>
                        )}
                        <a
                          href={`/impresa/giornate/${g.id}/chat`}
                          className="inline-block text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          💬 Chat
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtered.length} giornata{filtered.length !== 1 ? 'e' : ''} mostrata{filtered.length !== 1 ? 'e' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
