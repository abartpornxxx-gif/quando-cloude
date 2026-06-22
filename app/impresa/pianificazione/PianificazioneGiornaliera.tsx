'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, CalendarDays } from 'lucide-react'
import { creaPianificazione, eliminaPianificazione } from './actions'

/* ─── tipi ──────────────────────────────────────────────────────────────── */

interface Operaio {
  id: string
  nome: string
}

interface Pianificazione {
  id: string
  commessaId: string
  operaioId: string
  operaioNome: string
}

interface Commessa {
  id: string
  nome: string
  indirizzoCantiere: string | null
}

interface Props {
  commesse: Commessa[]
  operai: Operaio[]
  pianificazioni: Pianificazione[]   // per il giorno correntemente visualizzato
  giornoIniziale: string             // ISO date string YYYY-MM-DD
}

/* ─── utils ─────────────────────────────────────────────────────────────── */

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLabel(iso: string, oggi: string, domani: string): string {
  if (iso === oggi) return 'Oggi'
  if (iso === domani) return 'Domani'
  const d = parseISO(iso)
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatLabelLong(iso: string): string {
  const d = parseISO(iso)
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/* ─── componente principale ─────────────────────────────────────────────── */

export default function PianificazioneGiornaliera({ commesse, operai, pianificazioni: pianificazioniInit, giornoIniziale }: Props) {
  const oggi = toISO(new Date())
  const domaniDate = new Date(); domaniDate.setDate(domaniDate.getDate() + 1)
  const domani = toISO(domaniDate)

  const [giorno, setGiorno] = useState(giornoIniziale)
  const [pians, setPians] = useState<Pianificazione[]>(pianificazioniInit)
  const [mostraDatePicker, setMostraDatePicker] = useState(false)

  // bottom sheet
  const [sheetCommessaId, setSheetCommessaId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  const sheetCommessa = commesse.find(c => c.id === sheetCommessaId) ?? null

  // operai già assegnati in quel giorno (qualsiasi commessa)
  const occupatiMap: Record<string, string> = {}
  for (const p of pians) {
    occupatiMap[p.operaioId] = commesse.find(c => c.id === p.commessaId)?.nome ?? 'altro cantiere'
  }

  function piansPerCommessa(commessaId: string) {
    return pians.filter(p => p.commessaId === commessaId)
  }

  function navigaGiorno(delta: number) {
    const d = parseISO(giorno)
    d.setDate(d.getDate() + delta)
    setGiorno(toISO(d))
    // il cambio giorno richiede un reload dei dati: lo facciamo tramite searchParam URL
    // per semplicità: aggiorniamo tramite reload della pagina con searchParam
    window.location.href = `/impresa/pianificazione?giorno=${toISO(d)}`
  }

  function vai(g: string) {
    setMostraDatePicker(false)
    window.location.href = `/impresa/pianificazione?giorno=${g}`
  }

  function apriSheet(commessaId: string) {
    setSheetCommessaId(commessaId)
    setErrore('')
  }

  function chiudiSheet() {
    setSheetCommessaId(null)
    setErrore('')
  }

  function aggiungiOperaio(operaio: Operaio) {
    if (!sheetCommessaId) return
    setErrore('')
    startTransition(async () => {
      try {
        const result = await creaPianificazione({ commessaId: sheetCommessaId, operaioId: operaio.id, data: giorno })
        setPians(prev => {
          // evita duplicati
          const esiste = prev.some(p => p.commessaId === sheetCommessaId && p.operaioId === operaio.id)
          if (esiste) return prev
          return [...prev, { id: result.id, commessaId: sheetCommessaId, operaioId: operaio.id, operaioNome: operaio.nome }]
        })
        chiudiSheet()
      } catch (e: unknown) {
        setErrore(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  function rimuoviOperaio(pianId: string) {
    setErrore('')
    startTransition(async () => {
      try {
        await eliminaPianificazione(pianId)
        setPians(prev => prev.filter(p => p.id !== pianId))
      } catch (e: unknown) {
        setErrore(e instanceof Error ? e.message : 'Errore: ' + (e instanceof Error ? e.message : ''))
      }
    })
  }

  const labelGiorno = formatLabel(giorno, oggi, domani)
  const labelGiornoLong = formatLabelLong(giorno)

  return (
    <div className="space-y-4">

      {/* ── Selettore giorno ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2">
          {/* Freccia indietro */}
          <button
            onClick={() => navigaGiorno(-1)}
            className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
            aria-label="Giorno precedente"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>

          {/* Pulsanti rapidi Oggi / Domani */}
          <button
            onClick={() => vai(oggi)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              giorno === oggi
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Oggi
          </button>
          <button
            onClick={() => vai(domani)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              giorno === domani
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Domani
          </button>

          {/* Mostra data selezionata se non oggi/domani */}
          {giorno !== oggi && giorno !== domani && (
            <span className="flex-1 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-center">
              {labelGiorno}
            </span>
          )}

          <div className="flex-1" />

          {/* Input data */}
          <div className="relative">
            <button
              onClick={() => setMostraDatePicker(v => !v)}
              className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
              aria-label="Scegli data"
            >
              <CalendarDays size={18} className="text-gray-600" />
            </button>
            {mostraDatePicker && (
              <div className="absolute right-0 top-10 z-50 rounded-2xl border border-gray-200 bg-white shadow-lg p-3">
                <input
                  type="date"
                  defaultValue={giorno}
                  onChange={e => { if (e.target.value) vai(e.target.value) }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Freccia avanti */}
          <button
            onClick={() => navigaGiorno(1)}
            className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
            aria-label="Giorno successivo"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-400 text-center capitalize">{labelGiornoLong}</p>
      </div>

      {/* Errore globale */}
      {errore && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{errore}</p>
        </div>
      )}

      {/* ── Lista cantieri ───────────────────────────────────────────────── */}
      {commesse.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-gray-500">Nessun cantiere aperto</p>
          <p className="text-xs text-gray-400 mt-1">Apri o crea una commessa per pianificare.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commesse.map(commessa => {
            const assegnati = piansPerCommessa(commessa.id)
            return (
              <div key={commessa.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                {/* Intestazione cantiere */}
                <div className="mb-3">
                  <p className="font-bold text-gray-900 text-base">{commessa.nome}</p>
                  {commessa.indirizzoCantiere && (
                    <p className="text-xs text-gray-400 mt-0.5">{commessa.indirizzoCantiere}</p>
                  )}
                </div>

                {/* Pill operai assegnati */}
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {assegnati.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Nessun operaio assegnato</p>
                  ) : (
                    assegnati.map(p => (
                      <div
                        key={p.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1"
                      >
                        <span>{p.operaioNome}</span>
                        <button
                          onClick={() => rimuoviOperaio(p.id)}
                          disabled={pending}
                          className="rounded-full hover:bg-blue-200 p-0.5 transition-colors disabled:opacity-40"
                          aria-label={`Rimuovi ${p.operaioNome}`}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Pulsante aggiungi */}
                <button
                  onClick={() => apriSheet(commessa.id)}
                  disabled={pending}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition-colors disabled:opacity-40"
                >
                  <Plus size={15} />
                  Aggiungi operaio
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bottom sheet ─────────────────────────────────────────────────── */}
      {sheetCommessa && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={chiudiSheet}
          />
          {/* Pannello */}
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chi mandi su</p>
                <p className="text-base font-bold text-gray-900">{sheetCommessa.nome}</p>
                <p className="text-xs text-blue-600 font-medium capitalize">{labelGiornoLong}</p>
              </div>
              <button onClick={chiudiSheet} className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Lista operai */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {operai.map(op => {
                // già su questo cantiere in questo giorno?
                const giaSuQuestoCantiere = pians.some(p => p.commessaId === sheetCommessa.id && p.operaioId === op.id)
                // già su altro cantiere in questo giorno?
                const altroCantiere = !giaSuQuestoCantiere && occupatiMap[op.id]
                const disabilitato = !!altroCantiere

                return (
                  <div
                    key={op.id}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
                      giaSuQuestoCantiere
                        ? 'bg-blue-50 border-blue-200'
                        : disabilitato
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${disabilitato ? 'text-gray-400' : 'text-gray-900'}`}>
                        {op.nome}
                      </p>
                      {giaSuQuestoCantiere && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">✓ Già assegnato qui</p>
                      )}
                      {altroCantiere && (
                        <p className="text-xs text-gray-400 mt-0.5">Su: {altroCantiere}</p>
                      )}
                    </div>

                    {giaSuQuestoCantiere ? (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 rounded-full px-3 py-1">
                        Assegnato
                      </span>
                    ) : disabilitato ? (
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                        Occupato
                      </span>
                    ) : (
                      <button
                        onClick={() => aggiungiOperaio(op)}
                        disabled={pending}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 shadow-sm disabled:opacity-40 active:scale-95 transition-all"
                      >
                        {pending ? '…' : 'Aggiungi'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Padding bottom per iOS safe area */}
            <div className="h-6" />
          </div>
        </>
      )}
    </div>
  )
}
