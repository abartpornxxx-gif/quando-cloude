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

// ─── Modal statistiche mensili cantiere ─────────────────────────────────────

function CantiereStatsModal({
  stats,
  loading,
  month,
  onMonthChange,
  onClose,
}: {
  commessaId: string
  stats: any
  loading: boolean
  month: string
  onMonthChange: (m: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Riepilogo Mensile Cantiere</h3>
            <p className="text-xs text-gray-500">{stats?.nomeCantiere || 'Caricamento...'}</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">×</button>
        </div>

        {/* Selettore Mese */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Mese di riferimento:</label>
          <input
            type="month"
            value={month}
            onChange={e => onMonthChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-blue-500 animate-pulse font-medium">
            Caricamento statistiche in corso...
          </div>
        ) : !stats ? (
          <div className="py-12 text-center text-xs text-red-500 font-medium">
            Errore nel caricamento dei dati.
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPI Totale Giornate */}
            <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-800">Giornate Lavorate</p>
                <p className="text-xs text-blue-600 mt-0.5">Effettuate nel mese di {month}</p>
              </div>
              <span className="text-2xl font-black text-blue-700">{stats.totaleGiornate}</span>
            </div>

            {/* Eventi & Rapportini */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Eventi e Lavori Eseguiti (Rapportini)</p>
              {stats.giornate.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-150 rounded-xl bg-gray-50/30">
                  Nessuna giornata registrata in questo mese.
                </p>
              ) : (
                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100 border border-gray-100 rounded-xl p-3">
                  {stats.giornate.map((g: any, index: number) => (
                    <div key={g.id} className={`text-xs ${index > 0 ? 'pt-2' : ''}`}>
                      <div className="flex justify-between font-semibold text-gray-700">
                        <span>{new Date(g.data).toLocaleDateString('it-IT')}</span>
                        <span className="text-gray-500">{g.operaioNome}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        <strong className="text-gray-600">Previsto:</strong> {g.lavoroSvolto}
                      </p>
                      {g.lavoroEseguito && (
                        <p className="text-[11px] text-emerald-700 mt-0.5 bg-emerald-50/50 rounded px-1.5 py-0.5 border border-emerald-100">
                          <strong className="text-emerald-800">Eseguito:</strong> {g.lavoroEseguito}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Materiali presi */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Materiali Prelievati</p>
              {stats.materiali.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-150 rounded-xl bg-gray-50/30">
                  Nessun materiale registrato in questo mese.
                </p>
              ) : (
                <div className="max-h-[160px] overflow-y-auto border border-gray-100 rounded-xl p-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <th className="pb-1">Descrizione</th>
                        <th className="pb-1 text-right">Quantità</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.materiali.map((m: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 text-gray-700 font-medium">{m.descrizione}</td>
                          <td className="py-2 text-right text-gray-800 font-bold">
                            {m.quantita} <span className="text-gray-400 font-normal">{m.unita}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
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
        {/* Mostra "Assegna cantiere" solo se l'operaio non è già assegnato ad altro in questo giorno */}
        {commesseLibere.length > 0 && attivi.length === 0 && (
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
  const [erroreMsg, setErroreMsg] = useState('')

  const [cantiereStatsId, setCantiereStatsId] = useState<string | null>(null)
  const [cantiereStats, setCantiereStats] = useState<any | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsMonth, setStatsMonth] = useState(() => weekStart.slice(0, 7))

  async function loadCantiereStats(commessaId: string, monthStr: string) {
    setStatsLoading(true)
    setCantiereStatsId(commessaId)
    setStatsMonth(monthStr)
    try {
      const { getCantiereMeseStats } = await import('./actions')
      const stats = await getCantiereMeseStats(commessaId, monthStr)
      setCantiereStats(stats)
    } catch (e) {
      console.error(e)
      setErroreMsg('Impossibile caricare le statistiche del cantiere.')
    } finally {
      setStatsLoading(false)
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const totAssegnazioni = pians.filter(p => !p.sostituito).length

  async function handleAssegna(commessaId: string, date: string, operaioId: string) {
    const operaio = operai.find(o => o.id === operaioId)
    if (!operaio) return

    setErroreMsg('')
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
      setErroreMsg(err instanceof Error ? err.message : "Errore durante l'assegnazione. Riprova.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    if (id.startsWith('temp-')) return
    setErroreMsg('')
    setSaving(true)
    setPians(prev => prev.filter(p => p.id !== id))
    try {
      await eliminaPianificazione(id)
    } catch (err: unknown) {
      setErroreMsg(err instanceof Error ? err.message : 'Impossibile rimuovere la pianificazione.')
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
      {erroreMsg && (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2">
          <p className="text-sm font-medium text-red-700">{erroreMsg}</p>
        </div>
      )}

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
                  <td
                    className="border-b border-r border-gray-200 px-3 py-3 align-top cursor-pointer hover:bg-blue-50/50 transition-colors group"
                    onClick={() => loadCantiereStats(c.id, statsMonth)}
                    title="Clicca per visualizzare il riepilogo mensile"
                  >
                    <div className="text-xs font-semibold leading-snug text-gray-800 group-hover:text-blue-700 transition-colors flex items-center gap-1">
                      <span>{c.nome}</span>
                      <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">📊</span>
                    </div>
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

      {cantiereStatsId && (
        <CantiereStatsModal
          commessaId={cantiereStatsId}
          stats={cantiereStats}
          loading={statsLoading}
          month={statsMonth}
          onMonthChange={(m) => loadCantiereStats(cantiereStatsId, m)}
          onClose={() => {
            setCantiereStatsId(null)
            setCantiereStats(null)
          }}
        />
      )}
    </div>
  )
}
