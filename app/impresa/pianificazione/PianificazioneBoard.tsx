'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaPianificazione, eliminaPianificazione } from './actions'
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

// ─── Modal dettagli pianificazione ───────────────────────────────────────────

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{plan.operaio.nome}</p>
          <button onClick={onClose} className="text-lg text-gray-400">×</button>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Lavoro da fare</label>
          <textarea
            value={lavoro}
            onChange={e => setLavoro(e.target.value)}
            placeholder="Descrivi cosa deve fare l'operaio…"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Note materiale</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Materiale da portare, preparare…"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        {ok && <p className="text-xs text-green-600">✅ Salvato</p>}
        <button
          onClick={salva}
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}

// ─── Vista CANTIERI: riga=commessa, colonna=giorno ────────────────────────────

function CellaCantiere({
  cellId, pians, operai, onAssegna, onRemove, saving,
}: {
  cellId: string
  pians: PianMini[]
  operai: OperaioMini[]
  onAssegna: (commessaId: string, date: string, operaioId: string) => void
  onRemove: (id: string) => void
  saving: boolean
}) {
  const [dropdownAperto, setDropdownAperto] = useState(false)
  const [dettagliId, setDettagliId] = useState<string | null>(null)

  const [commessaId, date] = cellId.split('|')
  const attivi = pians.filter(p => !p.sostituito)
  const operaiLiberi = operai.filter(o => !attivi.some(p => p.operaioId === o.id))
  const planDettagli = pians.find(p => p.id === dettagliId)

  return (
    <td
      className="relative border-b border-r border-gray-200 p-1.5 align-top last:border-r-0"
      style={{ minWidth: 90, minHeight: 52 }}
    >
      {planDettagli && (
        <DettagliModal plan={planDettagli} onClose={() => setDettagliId(null)} />
      )}

      {pians.map(p => (
        <div key={p.id} className="mb-1">
          <div
            className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-white ${opColor(p.operaioId)} ${p.sostituito ? 'opacity-40' : ''}`}
          >
            <span className="flex-1 truncate" style={{ maxWidth: 45 }} title={p.operaio.nome}>
              {p.sostituito ? '✗ ' : ''}{p.operaio.nome.split(' ')[0]}
            </span>
            {!p.sostituito && (
              <button
                onClick={() => setDettagliId(p.id)}
                className="shrink-0 px-0.5 text-[9px] text-white/80 hover:text-white"
                title="Modifica dettagli"
              >
                ✏
              </button>
            )}
            <button
              onClick={() => onRemove(p.id)}
              disabled={saving}
              className="shrink-0 px-0.5 leading-none text-white/80 hover:text-white"
              title="Rimuovi"
            >
              ×
            </button>
          </div>
          {p.lavoroDaFare && !p.sostituito && (
            <p className="mt-0.5 truncate px-0.5 text-[9px] text-gray-500" title={p.lavoroDaFare}>
              {p.lavoroDaFare}
            </p>
          )}
        </div>
      ))}

      <div className="relative">
        <button
          onClick={() => setDropdownAperto(v => !v)}
          className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500"
          title="Assegna operaio"
        >
          +
        </button>
        {dropdownAperto && (
          <div className="absolute left-0 top-6 z-30 min-w-[130px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {operaiLiberi.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-gray-400">Tutti assegnati</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {operaiLiberi.map(o => (
                  <li key={o.id}>
                    <button
                      onClick={() => { setDropdownAperto(false); onAssegna(commessaId, date, o.id) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-blue-50"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${opColor(o.id)}`} />
                      {o.nome}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </td>
  )
}

// ─── Vista OPERAI: riga=operaio, colonna=giorno ───────────────────────────────

function CellaOperaio({
  operaioId, date, pians, commesse, onAssegna, onRemove, saving,
}: {
  operaioId: string
  date: string
  pians: PianMini[]
  commesse: CommessaMini[]
  onAssegna: (commessaId: string, date: string, operaioId: string) => void
  onRemove: (id: string) => void
  saving: boolean
}) {
  const [dropdownAperto, setDropdownAperto] = useState(false)

  const attivi = pians.filter(p => !p.sostituito)
  const commesseAssegnate = attivi.map(p => p.commessaId)
  const commesseLibere = commesse.filter(c => !commesseAssegnate.includes(c.id))

  return (
    <td
      className="relative border-b border-r border-gray-200 p-1.5 align-top last:border-r-0"
      style={{ minWidth: 100, minHeight: 52 }}
    >
      {attivi.map(p => {
        const commessa = commesse.find(c => c.id === p.commessaId)
        const nomeBreve = commessa?.nome.split(' ').slice(0, 2).join(' ') ?? '—'
        return (
          <div key={p.id} className="mb-1">
            <div
              className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-white ${opColor(p.commessaId)}`}
            >
              <span className="flex-1 truncate" style={{ maxWidth: 60 }} title={commessa?.nome}>
                {nomeBreve}
              </span>
              <button
                onClick={() => onRemove(p.id)}
                disabled={saving}
                className="shrink-0 px-0.5 leading-none text-white/80 hover:text-white"
                title="Rimuovi"
              >
                ×
              </button>
            </div>
            {p.lavoroDaFare && (
              <p className="mt-0.5 truncate px-0.5 text-[9px] text-gray-500" title={p.lavoroDaFare}>
                {p.lavoroDaFare}
              </p>
            )}
          </div>
        )
      })}

      <div className="relative">
        <button
          onClick={() => setDropdownAperto(v => !v)}
          className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500"
          title="Assegna a cantiere"
        >
          +
        </button>
        {dropdownAperto && (
          <div className="absolute left-0 top-6 z-30 min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {commesseLibere.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-gray-400">Nessun cantiere libero</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {commesseLibere.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => { setDropdownAperto(false); onAssegna(c.id, date, operaioId) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-blue-50"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${opColor(c.id)}`} />
                      <span className="truncate">{c.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </td>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────

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
  const [vista, setVista] = useState<'cantieri' | 'operai'>('cantieri')

  async function handleAssegna(commessaId: string, date: string, operaioId: string) {
    const operaio = operai.find(o => o.id === operaioId)
    if (!operaio) return

    const tempId = `temp-${Date.now()}`
    setSaving(true)
    setPians(prev => [
      ...prev,
      { id: tempId, commessaId, operaioId, data: date, operaio, sostituito: false, lavoroDaFare: null, noteMateriale: null },
    ])
    try {
      const result = await creaPianificazione({ commessaId, operaioId, data: date })
      setPians(prev => prev.map(p => (p.id === tempId ? { ...p, id: result.id } : p)))
    } catch {
      setPians(prev => prev.filter(p => p.id !== tempId))
      alert("Errore durante l'assegnazione. Riprova.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    if (id.startsWith('temp-')) return
    setSaving(true)
    setPians(prev => prev.filter(p => p.id !== id))
    try {
      await eliminaPianificazione(id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossibile rimuovere.'
      alert(msg)
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
    <div>
      {/* Navigazione + toggle vista */}
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

        {saving && <span className="text-xs text-blue-500 animate-pulse">Salvataggio…</span>}

        {/* Toggle */}
        <div className="ml-auto flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setVista('cantieri')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              vista === 'cantieri'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per cantiere
          </button>
          <button
            onClick={() => setVista('operai')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              vista === 'operai'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per operaio
          </button>
        </div>
      </div>

      {commesse.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          Nessuna commessa aperta da pianificare.
        </div>
      ) : vista === 'cantieri' ? (
        /* ── VISTA CANTIERI ── */
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-sm" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600" style={{ width: 160 }}>
                  Cantiere
                </th>
                {weekDays.map(d => (
                  <th key={d.date} className="border-b border-r border-gray-200 bg-gray-50 px-2 py-2.5 text-center text-xs font-semibold text-gray-600 last:border-r-0">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commesse.map((c, ci) => (
                <tr key={c.id} className={ci % 2 === 1 ? 'bg-gray-50/40' : ''}>
                  <td className="border-b border-r border-gray-200 px-3 py-2 align-top">
                    <div className="text-xs font-semibold leading-snug text-gray-800">{c.nome}</div>
                    {c.indirizzoCantiere && (
                      <div className="max-w-[140px] truncate text-[10px] text-gray-400">{c.indirizzoCantiere}</div>
                    )}
                  </td>
                  {weekDays.map(d => (
                    <CellaCantiere
                      key={d.date}
                      cellId={`${c.id}|${d.date}`}
                      pians={pians.filter(p => p.commessaId === c.id && p.data === d.date)}
                      operai={operai}
                      onAssegna={handleAssegna}
                      onRemove={handleRemove}
                      saving={saving}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── VISTA OPERAI ── */
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          {operai.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">Nessun operaio in anagrafica.</p>
          ) : (
            <table className="w-full border-collapse text-sm" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600" style={{ width: 140 }}>
                    Operaio
                  </th>
                  {weekDays.map(d => (
                    <th key={d.date} className="border-b border-r border-gray-200 bg-gray-50 px-2 py-2.5 text-center text-xs font-semibold text-gray-600 last:border-r-0">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operai.map((o, oi) => (
                  <tr key={o.id} className={oi % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    <td className="border-b border-r border-gray-200 px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opColor(o.id)}`} />
                        <span className="text-xs font-semibold text-gray-800">{o.nome}</span>
                      </div>
                    </td>
                    {weekDays.map(d => (
                      <CellaOperaio
                        key={d.date}
                        operaioId={o.id}
                        date={d.date}
                        pians={pians.filter(p => p.operaioId === o.id && p.data === d.date)}
                        commesse={commesse}
                        onAssegna={handleAssegna}
                        onRemove={handleRemove}
                        saving={saving}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
