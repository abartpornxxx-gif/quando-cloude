'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  useDraggable,
  useDroppable,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { creaPianificazione, eliminaPianificazione, sostituisciOperaio } from './actions'
import { salvaPianificazioneDettagli } from '../configurazione/actions'

type OperaioMini = { id: string; nome: string }
type CommessaMini = { id: string; nome: string; indirizzoCantiere: string | null }
type PianMini = {
  id: string
  commessaId: string
  operaioId: string
  data: string
  operaio: OperaioMini
  sostituito: boolean
  lavoroDaFare: string | null
  noteMateriale: string | null
}

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-600',
]
function opColor(id: string): string {
  return COLORS[parseInt(id.slice(-2), 16) % COLORS.length]
}

function DraggableOperaio({ operaio }: { operaio: OperaioMini }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: operaio.id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium select-none touch-none ${
        isDragging
          ? 'opacity-40 shadow-xl border-blue-400'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opColor(operaio.id)}`} />
      <span className="truncate">{operaio.nome}</span>
    </div>
  )
}

function DettagliModal({ plan, onClose }: { plan: PianMini; onClose: () => void }) {
  const [lavoro, setLavoro] = useState(plan.lavoroDaFare ?? '')
  const [note, setNote] = useState(plan.noteMateriale ?? '')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  async function salva() {
    setSaving(true)
    try {
      await salvaPianificazioneDettagli(plan.id, lavoro, note)
      setOk(true)
      setTimeout(onClose, 800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{plan.operaio.nome}</p>
          <button onClick={onClose} className="text-gray-400 text-lg">×</button>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">Lavoro da fare</label>
          <textarea
            value={lavoro}
            onChange={e => setLavoro(e.target.value)}
            placeholder="Descrivi cosa deve fare l'operaio..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-gray-600">Note materiale</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Materiale da portare, preparare..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        {ok && <p className="text-green-600 text-xs">✅ Salvato</p>}
        <button
          onClick={salva}
          disabled={saving}
          className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl text-sm disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}

function DropCell({
  cellId, pians, operai, onRemove, onSostituisci, saving,
}: {
  cellId: string
  pians: PianMini[]
  operai: OperaioMini[]
  onRemove: (id: string) => void
  onSostituisci: (pianId: string, nuovoOpId: string) => void
  saving: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId })
  const [sostituendoId, setSostituendoId] = useState<string | null>(null)
  const [dettagliId, setDettagliId] = useState<string | null>(null)

  const planDettagli = pians.find(p => p.id === dettagliId)

  return (
    <td
      ref={setNodeRef}
      style={{ minWidth: 90, minHeight: 52 }}
      className={`border-b border-r last:border-r-0 border-gray-200 p-1 align-top transition-colors ${
        isOver ? 'bg-blue-50 ring-1 ring-inset ring-blue-400' : 'bg-white hover:bg-gray-50'
      }`}
    >
      {planDettagli && (
        <DettagliModal plan={planDettagli} onClose={() => setDettagliId(null)} />
      )}
      {pians.map(p => (
        <div key={p.id} className="mb-1">
          <div
            className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-white ${opColor(p.operaioId)} ${
              p.sostituito ? 'opacity-40' : ''
            }`}
          >
            <span className="flex-1 truncate" style={{ maxWidth: 45 }} title={p.operaio.nome}>
              {p.sostituito ? '✗ ' : ''}{p.operaio.nome.split(' ')[0]}
            </span>
            {!p.sostituito && (
              <>
                <button
                  onClick={() => setDettagliId(p.id)}
                  className="shrink-0 text-white/80 hover:text-white text-[9px] px-0.5"
                  title="Dettagli giornata"
                >
                  ✏
                </button>
                <button
                  onClick={() => setSostituendoId(sostituendoId === p.id ? null : p.id)}
                  className="shrink-0 text-white/80 hover:text-white text-[10px] px-0.5"
                  title="Sostituisci"
                >
                  ↔
                </button>
              </>
            )}
            <button
              onClick={() => { setSostituendoId(null); onRemove(p.id) }}
              disabled={saving}
              className="shrink-0 text-white/80 hover:text-white leading-none px-0.5"
              title="Rimuovi"
            >
              ×
            </button>
          </div>
          {p.lavoroDaFare && !p.sostituito && (
            <p className="text-[9px] text-gray-500 truncate mt-0.5 px-0.5" title={p.lavoroDaFare}>
              📋 {p.lavoroDaFare}
            </p>
          )}
          {sostituendoId === p.id && (
            <div className="relative z-10 mt-1 rounded border border-gray-200 bg-white p-1 shadow-md">
              <p className="mb-1 text-[10px] text-gray-400">Sostituisci con:</p>
              {operai
                .filter(o => o.id !== p.operaioId)
                .map(o => (
                  <button
                    key={o.id}
                    onClick={() => { setSostituendoId(null); onSostituisci(p.id, o.id) }}
                    className="block w-full rounded px-1.5 py-0.5 text-left text-[11px] hover:bg-blue-50"
                  >
                    {o.nome}
                  </button>
                ))}
            </div>
          )}
        </div>
      ))}
    </td>
  )
}

export function PianificazioneBoard({
  weekDays, commesse, operai, pianificazioni: initialPians, weekStart,
}: {
  weekDays: { date: string; label: string }[]
  commesse: CommessaMini[]
  operai: OperaioMini[]
  pianificazioni: PianMini[]
  weekStart: string
}) {
  const router = useRouter()
  const [pians, setPians] = useState(initialPians)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const operaioId = String(active.id)
    const parts = String(over.id).split('|')
    const commessaId = parts[0]
    const date = parts[1]
    if (!commessaId || !date) return

    // Evita duplicati attivi
    if (pians.some(p => p.operaioId === operaioId && p.commessaId === commessaId && p.data === date && !p.sostituito)) return

    const operaio = operai.find(o => o.id === operaioId)
    if (!operaio) return

    const tempId = `temp-${Date.now()}`
    setSaving(true)
    setPians(prev => [...prev, { id: tempId, commessaId, operaioId, data: date, operaio, sostituito: false, lavoroDaFare: null, noteMateriale: null }])

    try {
      const result = await creaPianificazione({ commessaId, operaioId, data: date })
      setPians(prev => prev.map(p => (p.id === tempId ? { ...p, id: result.id } : p)))
    } catch {
      setPians(prev => prev.filter(p => p.id !== tempId))
    } finally {
      setSaving(false)
    }
  }, [pians, operai])

  async function handleRemove(id: string) {
    if (id.startsWith('temp-')) return
    setSaving(true)
    setPians(prev => prev.filter(p => p.id !== id))
    try {
      await eliminaPianificazione(id)
    } catch {
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleSostituisci(pianId: string, nuovoOpId: string) {
    setSaving(true)
    try {
      await sostituisciOperaio(pianId, nuovoOpId)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function navigate(dir: 'prev' | 'next') {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + (dir === 'next' ? 7 : -7))
    router.push(`/impresa/pianificazione?settimana=${d.toISOString().slice(0, 10)}`)
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar operai (draggable sources) */}
      <div className="w-44 shrink-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Operai</p>
        <div className="space-y-2">
          {operai.map(o => (
            <DraggableOperaio key={o.id} operaio={o} />
          ))}
        </div>
        {operai.length === 0 && (
          <p className="text-xs text-gray-400">Nessun operaio</p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-gray-400">
          Trascina un operaio sul cantiere e sulla data per pianificare
        </p>
        {saving && <p className="mt-2 text-xs text-blue-500 animate-pulse">Salvataggio…</p>}
      </div>

      {/* Planning grid */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('prev')}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Prec.
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {weekDays[0]?.label} — {weekDays[6]?.label}
          </span>
          <button
            onClick={() => navigate('next')}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Succ. →
          </button>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-sm" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600" style={{ width: 160 }}>
                    Cantiere
                  </th>
                  {weekDays.map(d => (
                    <th
                      key={d.date}
                      className="border-b border-r last:border-r-0 border-gray-200 bg-gray-50 px-2 py-2.5 text-center text-xs font-semibold text-gray-600"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commesse.map((c, ci) => (
                  <tr key={c.id} className={ci % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className="border-b last:border-b-0 border-r border-gray-200 px-3 py-2 align-top">
                      <div className="text-xs font-semibold text-gray-800 leading-snug">{c.nome}</div>
                      {c.indirizzoCantiere && (
                        <div className="max-w-[140px] truncate text-[10px] text-gray-400">
                          {c.indirizzoCantiere}
                        </div>
                      )}
                    </td>
                    {weekDays.map(d => (
                      <DropCell
                        key={d.date}
                        cellId={`${c.id}|${d.date}`}
                        pians={pians.filter(p => p.commessaId === c.id && p.data === d.date)}
                        operai={operai}
                        onRemove={handleRemove}
                        onSostituisci={handleSostituisci}
                        saving={saving}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DndContext>

        {commesse.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
            Nessuna commessa aperta da pianificare.
          </div>
        )}
      </div>
    </div>
  )
}
