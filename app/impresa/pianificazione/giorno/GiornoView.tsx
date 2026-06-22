'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react'
import { creaPianificazione, eliminaPianificazione } from '../actions'

type OperaioMini = { id: string; nome: string }
type CommessaMini = { id: string; nome: string; indirizzoCantiere: string | null }
type PianMini = {
  id: string
  commessaId: string
  operaioId: string
  operaio: OperaioMini
  sostituito: boolean
}

const CHIP_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-600',
]

function chipColor(id: string): string {
  return CHIP_COLORS[parseInt(id.slice(-2), 16) % CHIP_COLORS.length]
}

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

function formatData(dateStr: string): string {
  const d = new Date(dateStr)
  return `${GIORNI[d.getUTCDay()]} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function GiornoView({
  data,
  commesse,
  operai,
  pianificazioni: initialPians,
}: {
  data: string
  commesse: CommessaMini[]
  operai: OperaioMini[]
  pianificazioni: PianMini[]
}) {
  const router = useRouter()
  const [pians, setPians] = useState(initialPians)
  const [dropdownAperto, setDropdownAperto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function naviga(dir: 'prev' | 'next') {
    setDropdownAperto(null)
    router.push(`/impresa/pianificazione/giorno?data=${addDays(data, dir === 'next' ? 1 : -1)}`)
  }

  async function handleAssegna(commessaId: string, operaioId: string) {
    setDropdownAperto(null)
    if (busy) return
    const operaio = operai.find(o => o.id === operaioId)
    if (!operaio) return

    const tempId = `temp-${Date.now()}`
    setBusy(true)
    setPians(prev => [...prev, { id: tempId, commessaId, operaioId, operaio, sostituito: false }])

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
    const ok = window.confirm(
      `Rimuovere ${pian.operaio.nome} da "${commessaNome}" del ${formatData(data)}?`
    )
    if (!ok) return

    setBusy(true)
    setPians(prev => prev.filter(p => p.id !== pian.id))
    try {
      await eliminaPianificazione(pian.id)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossibile rimuovere: potrebbe esserci una giornata già avviata.'
      alert(msg)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pianificazione giorno</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Assegna operai ai cantieri toccando — niente trascinamento
          </p>
        </div>
        <a
          href="/impresa/pianificazione/board"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium shadow-sm"
        >
          Vista settimanale
        </a>
      </div>

      {/* Navigazione data */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => naviga('prev')}
          className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Prec.
        </button>
        <span className="flex-1 text-center text-base font-semibold text-gray-900 capitalize">
          {formatData(data)}
        </span>
        <button
          onClick={() => naviga('next')}
          className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm"
        >
          Succ.
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {busy && (
        <p className="text-center text-xs text-blue-500 animate-pulse">Salvataggio…</p>
      )}

      {/* Cantieri */}
      {commesse.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          Nessuna commessa aperta da pianificare.
        </div>
      ) : (
        <div className="space-y-3">
          {commesse.map(c => {
            const commessaPians = pians.filter(p => p.commessaId === c.id && !p.sostituito)
            const isOpen = dropdownAperto === c.id
            // Esclude anche operai già assegnati ad ALTRI cantieri oggi
            const occupatiAltrove = new Set(
              pians.filter(p => p.commessaId !== c.id && !p.sostituito).map(p => p.operaioId)
            )
            const operaiLiberi = operai.filter(
              o => !commessaPians.some(p => p.operaioId === o.id) && !occupatiAltrove.has(o.id)
            )

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4"
              >
                {/* Nome cantiere */}
                <div className="mb-3">
                  <p className="font-semibold text-gray-900">{c.nome}</p>
                  {c.indirizzoCantiere && (
                    <p className="mt-0.5 text-xs text-gray-400">{c.indirizzoCantiere}</p>
                  )}
                </div>

                {/* Chips operai assegnati */}
                <div className="mb-3 flex min-h-[28px] flex-wrap gap-2">
                  {commessaPians.length === 0 && (
                    <span className="self-center text-xs text-gray-400">
                      Nessun operaio assegnato
                    </span>
                  )}
                  {commessaPians.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleRimuovi(p, c.nome)}
                      title="Tocca per rimuovere"
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white transition-opacity hover:opacity-80 active:opacity-60 ${chipColor(p.operaioId)} ${p.id.startsWith('temp-') ? 'opacity-60' : ''}`}
                    >
                      {p.operaio.nome}
                      <X className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Bottone + dropdown assegna */}
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
                        <p className="px-4 py-3 text-sm text-gray-400">
                          Tutti gli operai già assegnati a questo cantiere
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {operaiLiberi.map(o => (
                            <li key={o.id}>
                              <button
                                onClick={() => handleAssegna(c.id, o.id)}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-blue-50"
                              >
                                <span
                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${chipColor(o.id)}`}
                                />
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
    </div>
  )
}
