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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{plan.operaio.nome}</p>
          <button onClick={onClose} className="text-lg text-gray-400 hover:text-gray-600">×</button>
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
  cellId, pians, operai, operaiBusyNelGiorno, onAssegna, onRemove, saving, isToday,
}: {
  cellId: string
  pians: PianMini[]
  operai: OperaioMini[]
  operaiBusyNelGiorno: ReadonlySet<string>
  onAssegna: (commessaId: string, date: string, operaioId: string) => void
  onRemove: (id: string) => void
  saving: boolean
  isToday: boolean
}) {
  const [dropdownAperto, setDropdownAperto] = useState(false)
  const [dettagliId, setDettagliId] = useState<string | null>(null)

  const [commessaId, date] = cellId.split('|')
  const attivi = pians.filter(p => !p.sostituito)
  // Esclude operai già assegnati ad altri cantieri nello stesso giorno
  const operaiLiberi = operai.filter(
    o => !attivi.some(p => p.operaioId === o.id) && !operaiBusyNelGiorno.has(o.id)
  )
  const planDettagli = pians.find(p => p.id === dettagliId)

  return (
    <td
      className={`relative border-b border-r border-gray-200 p-2 align-top last:border-r-0 transition-colors ${
        isToday ? 'bg-blue-50/40' : 'bg-white'
      }`}
      style={{ minWidth: 110, minHeight: 88 }}
    >
      {planDettagli && (
        <DettagliModal plan={planDettagli} onClose={() => setDettagliId(null)} />
      )}

      <div className="mb-1.5 space-y-1">
        {pians.map(p => (
          <div key={p.id}>
            <div
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white ${opColor(p.operaioId)} ${
                p.sostituito ? 'opacity-40' : ''
              }`}
            >
              <span className="flex-1 truncate font-medium" title={p.operaio.nome}>
                {p.sostituito ? '✗ ' : ''}{p.operaio.nome.split(' ')[0]}
              </span>
              {!p.sostituito && (
                <button
                  onClick={() => setDettagliId(p.id)}
                  className="shrink-0 text-[10px] text-white/70 hover:text-white"
                  title="Modifica dettagli"
                >
                  ✏
                </button>
              )}
              <button
                onClick={() => onRemove(p.id)}
                disabled={saving}
                className="shrink-0 font-bold leading-none text-white/70 hover:text-white"
                title="Rimuovi"
              >
                ×
              </button>
            </div>
            {p.lavoroDaFare && !p.sostituito && (
              <p className="mt-0.5 truncate px-1 text-[10px] text-gray-500" title={p.lavoroDaFare}>
                {p.lavoroDaFare}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="relative">
        {operaiLiberi.length > 0 && (
          <button
            onClick={() => setDropdownAperto(v => !v)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Aggiungi operaio</span>
          </button>
        )}
        {dropdownAperto && (
          <div className="absolute left-0 top-9 z-30 min-w-[150px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
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
          </div>
        )}
      </div>
    </td>
  )
}

// ─── Vista OPERAI: riga=operaio, colonna=giorno ───────────────────────────────

function CellaOperaio({
  operaioId, date, pians, commesse, onAssegna, onRemove, saving, isToday,
}: {
  operaioId: string
  date: string
  pians: PianMini[]
  commesse: CommessaMini[]
  onAssegna: (commessaId: string, date: string, operaioId: string) => void
  onRemove: (id: string) => void
  saving: boolean
  isToday: boolean
}) {
  const [dropdownAperto, setDropdownAperto] = useState(false)

  const attivi = pians.filter(p => !p.sostituito)
  const commesseAssegnate = attivi.map(p => p.commessaId)
  const commesseLibere = commesse.filter(c => !commesseAssegnate.includes(c.id))

  return (
    <td
      className={`relative border-b border-r border-gray-200 p-2 align-top last:border-r-0 transition-colors ${
        isToday ? 'bg-blue-50/40' : 'bg-white'
      }`}
      style={{ minWidth: 110, minHeight: 88 }}
    >
      <div className="mb-1.5 space-y-1">
        {attivi.map(p => {
          const commessa = commesse.find(c => c.id === p.commessaId)
          return (
            <div key={p.id}>
              <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white ${opColor(p.commessaId)}`}>
                <span className="flex-1 truncate font-medium" title={commessa?.nome}>
                  {commessa?.nome.split(' ').slice(0, 2).join(' ') ?? '—'}
                </span>
                <button
                  onClick={() => onRemove(p.id)}
                  disabled={saving}
                  className="shrink-0 font-bold leading-none text-white/70 hover:text-white"
                  title="Rimuovi"
                >
                  ×
                </button>
              </div>
              {p.lavoroDaFare && (
                <p className="mt-0.5 truncate px-1 text-[10px] text-gray-500" title={p.lavoroDaFare}>
                  {p.lavoroDaFare}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="relative">
        {commesseLibere.length > 0 && (
          <button
            onClick={() => setDropdownAperto(v => !v)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Assegna cantiere</span>
          </button>
        )}
        {dropdownAperto && (
          <div className="absolute left-0 top-9 z-30 min-w-[170px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
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

  const todayStr = new Date().toISOString().slice(0, 10)
  const totAssegnazioni = pians.filter(p => !p.sostituito).length

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
    } catch (err: unknown) {
      setPians(prev => prev.filter(p => p.id !== tempId))
      alert(err instanceof Error ? err.message : "Errore durante l'assegnazione. Riprova.")
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
    // Naviga alla board con la settimana corretta (bug fix: era /impresa/pianificazione)
    router.push(`/impresa/pianificazione/board?settimana=${d.toISOString().slice(0, 10)}`)
  }

  // Header colonne: parse "Lun 2/6" → { giorno: "Lun", data: "2/6" }
  function parseLabel(label: string) {
    const parts = label.split(' ')
    return { giorno: parts[0] ?? '', data: parts[1] ?? '' }
  }

  const headerCols = (
    <>
      {weekDays.map(d => {
        const isToday = d.date === todayStr
        const { giorno, data } = parseLabel(d.label)
        return (
          <th
            key={d.date}
            className={`border-b border-r border-gray-200 px-1 py-2.5 text-center last:border-r-0 ${
              isToday ? 'bg-blue-50' : 'bg-gray-50/60'
            }`}
          >
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
              {giorno}
            </div>
            <div className={`text-sm font-bold leading-tight ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
              {data}
            </div>
            {isToday && (
              <div className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-blue-500" />
            )}
          </th>
        )
      })}
    </>
  )

  return (
    <div className="space-y-4">
      {/* Navigazione + toggle vista */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('prev')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
        >
          ← Prec.
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-gray-800">
          {weekDays[1]?.label} — {weekDays[5]?.label}
        </span>
        <button
          onClick={() => navigate('next')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Succ. →
        </button>

        {saving && <span className="text-xs text-blue-500 animate-pulse">Salvataggio…</span>}

        {/* Toggle vista */}
        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setVista('cantieri')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              vista === 'cantieri' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per cantiere
          </button>
          <button
            onClick={() => setVista('operai')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              vista === 'operai' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Per operaio
          </button>
        </div>
      </div>

      {/* Riepilogo settimana */}
      <p className="text-xs text-gray-500">
        {totAssegnazioni > 0 ? (
          <>
            <span className="font-semibold text-blue-600">{totAssegnazioni}</span>
            {' '}assegnazion{totAssegnazioni === 1 ? 'e' : 'i'} questa settimana
          </>
        ) : (
          <span className="text-gray-400">Nessuna assegnazione questa settimana — usa &quot;Aggiungi operaio&quot; nelle celle</span>
        )}
      </p>

      {commesse.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-gray-600">Nessuna commessa aperta da pianificare</p>
          <p className="mt-1 text-xs text-gray-400">Apri una commessa per poter assegnare gli operai.</p>
        </div>
      ) : vista === 'cantieri' ? (

        /* ── VISTA CANTIERI ── */
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th
                  className="border-b border-r border-gray-200 bg-gray-50/60 px-4 py-3 text-left text-xs font-semibold text-gray-600"
                  style={{ width: 160, minWidth: 140 }}
                >
                  Cantiere
                </th>
                {headerCols}
              </tr>
            </thead>
            <tbody>
              {commesse.map((c, ci) => (
                <tr key={c.id} className={ci % 2 === 1 ? 'bg-gray-50/30' : ''}>
                  <td className="border-b border-r border-gray-200 px-3 py-3 align-top">
                    <div className="text-xs font-semibold leading-snug text-gray-800">{c.nome}</div>
                    {c.indirizzoCantiere && (
                      <div className="mt-0.5 max-w-[140px] truncate text-[10px] text-gray-400">
                        {c.indirizzoCantiere}
                      </div>
                    )}
                  </td>
                  {weekDays.map(d => (
                    <CellaCantiere
                      key={d.date}
                      cellId={`${c.id}|${d.date}`}
                      pians={pians.filter(p => p.commessaId === c.id && p.data === d.date)}
                      operai={operai}
                      operaiBusyNelGiorno={new Set(
                        pians
                          .filter(p => p.commessaId !== c.id && p.data === d.date && !p.sostituito)
                          .map(p => p.operaioId)
                      )}
                      onAssegna={handleAssegna}
                      onRemove={handleRemove}
                      saving={saving}
                      isToday={d.date === todayStr}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : operai.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-gray-600">Nessun operaio in anagrafica</p>
        </div>
      ) : (

        /* ── VISTA OPERAI ── */
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th
                  className="border-b border-r border-gray-200 bg-gray-50/60 px-4 py-3 text-left text-xs font-semibold text-gray-600"
                  style={{ width: 140, minWidth: 120 }}
                >
                  Operaio
                </th>
                {headerCols}
              </tr>
            </thead>
            <tbody>
              {operai.map((o, oi) => (
                <tr key={o.id} className={oi % 2 === 1 ? 'bg-gray-50/30' : ''}>
                  <td className="border-b border-r border-gray-200 px-3 py-3 align-middle">
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
                      isToday={d.date === todayStr}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
