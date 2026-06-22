'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react'
import { creaPianificazione, eliminaPianificazione } from '../actions'
import { creaPianificazioneConStima } from './actions'

type OperaioMini = { id: string; nome: string }
type CommessaMini = { id: string; nome: string; indirizzoCantiere: string | null }
type PianMini = {
  id: string
  commessaId: string
  operaioId: string
  operaio: OperaioMini
  lavoroDaFare: string | null
}
type Suggerimento = {
  id: string
  operaio: { id: string; nome: string }
  commessa: { id: string; nome: string }
  cosaFareDomani: string
  urgenzaDomani: number | null
  stimaOreDomani: number | null
  giaAssegnato: boolean
}

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-600',
]
function chipColor(id: string): string {
  return COLORS[parseInt(id.slice(-2), 16) % COLORS.length]
}

function urgenzaLabel(u: number | null): string {
  if (!u) return ''
  if (u >= 5) return '🔴 Urgente'
  if (u >= 4) return '🟠 Alta'
  if (u >= 3) return '🟡 Media'
  return '🟢 Bassa'
}

// Popup conferma pianificazione da suggerimento
function SuggerimentoConfermaPanel({
  sug, commesse, data, onConfermato,
}: {
  sug: Suggerimento
  commesse: CommessaMini[]
  data: string
  onConfermato: () => void
}) {
  const [aperto, setAperto] = useState(false)
  const [commessaSel, setCommessaSel] = useState(sug.commessa.id)
  const [lavoro, setLavoro] = useState(sug.cosaFareDomani)
  const [stimaOre, setStimaOre] = useState(sug.stimaOreDomani?.toString() ?? '')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function conferma() {
    setPending(true)
    try {
      await creaPianificazioneConStima({
        operaioId: sug.operaio.id,
        commessaId: commessaSel,
        data,
        lavoroDaFare: lavoro.trim() || undefined,
        stimaImpresaOre: stimaOre ? parseFloat(stimaOre) : undefined,
      })
      setDone(true)
      setAperto(false)
      onConfermato()
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return <p className="text-xs font-semibold text-emerald-600">✓ Pianificato</p>
  }

  return (
    <div>
      {!aperto ? (
        <button
          onClick={() => setAperto(true)}
          className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
        >
          + Pianifica da suggerimento
        </button>
      ) : (
        <div className="mt-2 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Pianifica {sug.operaio.nome}</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Cantiere</label>
            <select
              value={commessaSel}
              onChange={e => setCommessaSel(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Lavoro da fare</label>
            <textarea
              value={lavoro}
              onChange={e => setLavoro(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Stima ore{sug.stimaOreDomani ? ` (operaio: ${sug.stimaOreDomani}h)` : ''}
            </label>
            <input
              type="number" min="1" max="12" step="0.5"
              value={stimaOre}
              onChange={e => setStimaOre(e.target.value)}
              placeholder="es. 8"
              className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={conferma}
              disabled={pending}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? '…' : 'Conferma'}
            </button>
            <button
              onClick={() => setAperto(false)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────

export function DomaniPlannerView({
  data,
  dataLabel,
  commesse,
  operai,
  pianificazioni: initialPians,
  suggerimenti,
}: {
  data: string
  dataLabel: string
  commesse: CommessaMini[]
  operai: OperaioMini[]
  pianificazioni: PianMini[]
  suggerimenti: Suggerimento[]
}) {
  const router = useRouter()
  const [pians, setPians] = useState(initialPians)
  const [dropdownAperto, setDropdownAperto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [suggerimentoAperto, setSuggerimentoAperto] = useState(true)

  async function handleAssegna(commessaId: string, operaioId: string) {
    setDropdownAperto(null)
    if (busy) return
    const operaio = operai.find(o => o.id === operaioId)
    if (!operaio) return

    const tempId = `temp-${Date.now()}`
    setBusy(true)
    setPians(prev => [...prev, { id: tempId, commessaId, operaioId, operaio, lavoroDaFare: null }])
    try {
      const result = await creaPianificazione({ commessaId, operaioId, data })
      setPians(prev => prev.map(p => (p.id === tempId ? { ...p, id: result.id } : p)))
    } catch (err: unknown) {
      setPians(prev => prev.filter(p => p.id !== tempId))
      alert(err instanceof Error ? err.message : "Errore durante l'assegnazione. Riprova.")
    } finally {
      setBusy(false)
    }
  }

  async function handleRimuovi(pian: PianMini, commessaNome: string) {
    if (pian.id.startsWith('temp-') || busy) return
    const ok = window.confirm(`Rimuovere ${pian.operaio.nome} da "${commessaNome}"?`)
    if (!ok) return

    setBusy(true)
    setPians(prev => prev.filter(p => p.id !== pian.id))
    try {
      await eliminaPianificazione(pian.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossibile rimuovere.'
      alert(msg)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function handleConfermato() {
    router.refresh()
  }

  const totaleAssegnati = new Set(pians.map(p => p.operaioId)).size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pianifica domani</h1>
          <p className="mt-0.5 text-sm text-gray-500 capitalize">
            {dataLabel} · {totaleAssegnati} operai pianificati
          </p>
        </div>
        <a
          href="/impresa/pianificazione"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium shadow-sm"
        >
          Vista settimanale
        </a>
      </div>

      {busy && <p className="text-center text-xs text-blue-500 animate-pulse">Salvataggio…</p>}

      {/* ── SEZIONE PRINCIPALE: assegnazioni ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Cantieri attivi — assegna operai per domani
        </p>
        {commesse.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
            Nessuna commessa aperta.
          </div>
        ) : (
          <div className="space-y-3">
            {commesse.map(c => {
              const commessaPians = pians.filter(p => p.commessaId === c.id)
              const isOpen = dropdownAperto === c.id
              // Esclude anche operai già assegnati ad ALTRI cantieri domani
              const occupatiAltrove = new Set(
                pians.filter(p => p.commessaId !== c.id).map(p => p.operaioId)
              )
              const operaiLiberi = operai.filter(
                o => !commessaPians.some(p => p.operaioId === o.id) && !occupatiAltrove.has(o.id)
              )

              return (
                <div key={c.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                  <div className="mb-3">
                    <p className="font-semibold text-gray-900">{c.nome}</p>
                    {c.indirizzoCantiere && (
                      <p className="mt-0.5 text-xs text-gray-400">{c.indirizzoCantiere}</p>
                    )}
                  </div>

                  {/* Chips operai assegnati */}
                  <div className="mb-3 flex min-h-[28px] flex-wrap gap-2">
                    {commessaPians.length === 0 && (
                      <span className="self-center text-xs text-gray-400">Nessun operaio assegnato</span>
                    )}
                    {commessaPians.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleRimuovi(p, c.nome)}
                        title="Tocca per rimuovere"
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white transition-opacity hover:opacity-80 active:opacity-60 ${chipColor(p.operaioId)} ${p.id.startsWith('temp-') || p.id.startsWith('from-sug-') ? 'opacity-70' : ''}`}
                      >
                        {p.operaio.nome}
                        <X className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Bottone + dropdown */}
                  <div>
                    <button
                      onClick={() => setDropdownAperto(isOpen ? null : c.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assegna operaio
                    </button>

                    {isOpen && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                        {operaiLiberi.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-400">Tutti gli operai già assegnati</p>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {operaiLiberi.map(o => (
                              <li key={o.id}>
                                <button
                                  onClick={() => handleAssegna(c.id, o.id)}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-blue-50"
                                >
                                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${chipColor(o.id)}`} />
                                  <span className="font-medium text-gray-800">{o.nome}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SEZIONE SECONDARIA: suggerimenti operai (collassabile) ── */}
      {suggerimenti.length > 0 && (
        <section>
          <button
            onClick={() => setSuggerimentoAperto(v => !v)}
            className="flex w-full items-center justify-between mb-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Suggerimenti dagli operai ({suggerimenti.length})
            </p>
            {suggerimentoAperto
              ? <ChevronUp className="h-4 w-4 text-gray-400" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>

          {suggerimentoAperto && (
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
              {suggerimenti.map(s => (
                <div key={s.id} className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        {s.operaio.nome.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.operaio.nome}</p>
                        <p className="text-xs text-gray-500">{s.commessa.nome}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      {s.urgenzaDomani && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {urgenzaLabel(s.urgenzaDomani)}
                        </span>
                      )}
                      {s.giaAssegnato && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Assegnato ✓
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 rounded-xl bg-emerald-50 p-3">
                    <p className="text-sm leading-relaxed text-gray-800">{s.cosaFareDomani}</p>
                    {s.stimaOreDomani && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Stima operaio: {s.stimaOreDomani}h
                      </p>
                    )}
                  </div>

                  {!s.giaAssegnato && (
                    <SuggerimentoConfermaPanel
                      sug={s}
                      commesse={commesse}
                      data={data}
                      onConfermato={handleConfermato}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
