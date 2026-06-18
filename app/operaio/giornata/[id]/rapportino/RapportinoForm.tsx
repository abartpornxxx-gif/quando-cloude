'use client'

import { useState, useTransition } from 'react'
import { inviaRapportino } from './actions'

type Attrezzatura = { id: string; nome: string }
type Materiale = { id: string; descrizione: string; unita: string | null }

interface RigaReso {
  materialeId: string
  descrizione: string
  quantita: string
}

interface Props {
  giornataId: string
  attrezzatureUsate: Attrezzatura[]
  materiali: Materiale[]
}

export default function RapportinoForm({ giornataId, attrezzatureUsate, materiali }: Props) {
  const [lavoroEseguito, setLavoroEseguito] = useState('')
  const [lavoriExtra, setLavoriExtra] = useState('')
  const [noteAttrezzatura, setNoteAttrezzatura] = useState('')
  const [noteGiornoSuccessivo, setNoteGiornoSuccessivo] = useState('')
  const [oreOrdinarie, setOreOrdinarie] = useState('8')
  const [oreStraordinarie, setOreStraordinarie] = useState('0')
  // Pianificazione domani
  const [cosaFareDomani, setCosaFareDomani] = useState('')
  const [urgenzaDomani, setUrgenzaDomani] = useState<number>(3)
  const [stimaOreDomani, setStimeOreDomani] = useState('')
  const [attrRiconsegnate, setAttrRiconsegnate] = useState<string[]>(
    attrezzatureUsate.map(a => a.id)
  )
  const [righeReso, setRigheReso] = useState<RigaReso[]>([])
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  function toggleAttr(id: string) {
    setAttrRiconsegnate(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  function aggiungiReso() {
    setRigheReso(prev => [...prev, { materialeId: '', descrizione: '', quantita: '1' }])
  }

  function rimuoviReso(idx: number) {
    setRigheReso(prev => prev.filter((_, i) => i !== idx))
  }

  function aggiornaReso(idx: number, campo: keyof RigaReso, valore: string) {
    setRigheReso(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (campo === 'materialeId') {
        const mat = materiali.find(m => m.id === valore)
        return { ...r, materialeId: valore, descrizione: mat?.descrizione ?? r.descrizione }
      }
      return { ...r, [campo]: valore }
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lavoroEseguito.trim()) { setErrore('Descrivi il lavoro eseguito'); return }
    const ore = parseFloat(oreOrdinarie) || 0
    const oreSt = parseFloat(oreStraordinarie) || 0
    if (ore <= 0 && oreSt <= 0) { setErrore('Inserisci almeno le ore lavorate'); return }
    setErrore('')

    const resoValidi = righeReso
      .filter(r => r.materialeId && r.descrizione.trim() && parseFloat(r.quantita) > 0)
      .map(r => ({
        materialeId: r.materialeId,
        descrizione: r.descrizione,
        quantita: parseFloat(r.quantita),
      }))

    startTransition(async () => {
      try {
        await inviaRapportino(giornataId, {
          lavoroEseguito,
          lavoriExtra: lavoriExtra || undefined,
          noteAttrezzatura: noteAttrezzatura || undefined,
          noteGiornoSuccessivo: noteGiornoSuccessivo || undefined,
          oreOrdinarie: ore,
          oreStraordinarie: oreSt,
          attrezzatureIds: attrRiconsegnate,
          materialiReso: resoValidi.length > 0 ? resoValidi : undefined,
          cosaFareDomani: cosaFareDomani.trim() || undefined,
          urgenzaDomani: cosaFareDomani.trim() ? urgenzaDomani : undefined,
          stimaOreDomani: cosaFareDomani.trim() && stimaOreDomani ? parseFloat(stimaOreDomani) : undefined,
        })
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-xl mx-auto space-y-5">

      <div>
        <label className="block text-sm font-semibold mb-1">Lavoro eseguito oggi *</label>
        <textarea
          value={lavoroEseguito}
          onChange={e => setLavoroEseguito(e.target.value)}
          placeholder="Descrivi cosa hai fatto oggi…"
          className="w-full border rounded-xl px-3 py-2 text-sm"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Lavori extra / imprevisti</label>
        <textarea
          value={lavoriExtra}
          onChange={e => setLavoriExtra(e.target.value)}
          placeholder="Hai fatto qualcosa fuori dal piano? Cosa e perché?"
          className="w-full border rounded-xl px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1">Ore ordinarie</label>
          <input
            type="number"
            min="0"
            max="12"
            step="0.5"
            value={oreOrdinarie}
            onChange={e => setOreOrdinarie(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1">Ore straordinarie</label>
          <input
            type="number"
            min="0"
            max="6"
            step="0.5"
            value={oreStraordinarie}
            onChange={e => setOreStraordinarie(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {attrezzatureUsate.length > 0 && (
        <div>
          <label className="block text-sm font-semibold mb-2">Attrezzatura riconsegnata</label>
          <p className="text-xs text-gray-500 mb-2">Spunta ciò che hai riportato in magazzino:</p>
          <div className="space-y-2">
            {attrezzatureUsate.map(a => (
              <label key={a.id} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={attrRiconsegnate.includes(a.id)}
                  onChange={() => toggleAttr(a.id)}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium">{a.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1">Problemi con attrezzatura</label>
        <textarea
          value={noteAttrezzatura}
          onChange={e => setNoteAttrezzatura(e.target.value)}
          placeholder="Hai trovato problemi con qualche attrezzo? (opzionale)"
          className="w-full border rounded-xl px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      {/* Sezione reso materiale */}
      {materiali.length > 0 && (
        <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-800">Materiale non usato da restituire</p>
              <p className="text-xs text-yellow-600 mt-0.5">Hai preso materiale in più che riporti in magazzino?</p>
            </div>
            <button
              type="button"
              onClick={aggiungiReso}
              className="text-xs text-yellow-700 font-medium border border-yellow-300 rounded-lg px-2 py-1 hover:bg-yellow-100"
            >
              + Aggiungi
            </button>
          </div>

          {righeReso.length > 0 && (
            <div className="space-y-2">
              {righeReso.map((r, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-yellow-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Reso {idx + 1}</p>
                    <button type="button" onClick={() => rimuoviReso(idx)} className="text-xs text-red-500">Rimuovi</button>
                  </div>
                  <select
                    value={r.materialeId}
                    onChange={e => aggiornaReso(idx, 'materialeId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    required
                  >
                    <option value="">— Seleziona materiale —</option>
                    {materiali.map(m => (
                      <option key={m.id} value={m.id}>{m.descrizione} ({m.unita ?? 'pz'})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={r.quantita}
                      onChange={e => aggiornaReso(idx, 'quantita', e.target.value)}
                      placeholder="Qtà"
                      className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={r.descrizione}
                      onChange={e => aggiornaReso(idx, 'descrizione', e.target.value)}
                      placeholder="Descrizione (opzionale)"
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1">Note per domani</label>
        <textarea
          value={noteGiornoSuccessivo}
          onChange={e => setNoteGiornoSuccessivo(e.target.value)}
          placeholder="Cosa devi ricordare per domani? Cosa resta da fare?"
          className="w-full border rounded-xl px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      {/* Pianificazione giorno successivo */}
      <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 space-y-4">
        <div>
          <p className="text-sm font-bold text-emerald-800">📅 Pianificazione di domani</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Queste info aiutano l&apos;impresa a organizzare le giornate del giorno dopo.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-emerald-900 mb-1">Cosa c&apos;è da fare domani?</label>
          <textarea
            value={cosaFareDomani}
            onChange={e => setCosaFareDomani(e.target.value)}
            placeholder="Descrivi il lavoro da continuare o iniziare domani…"
            className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white"
            rows={3}
          />
        </div>

        {cosaFareDomani.trim() && (
          <>
            <div>
              <label className="block text-sm font-semibold text-emerald-900 mb-2">
                Urgenza: <span className="text-emerald-700">{urgenzaDomani}/5</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setUrgenzaDomani(v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                      urgenzaDomani === v
                        ? v >= 4 ? 'bg-red-500 border-red-500 text-white'
                          : v === 3 ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-gray-200 text-gray-500'
                    }`}
                  >
                    {v}
                    {v === 1 && ' 🟢'}
                    {v === 3 && ' 🟡'}
                    {v === 5 && ' 🔴'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                {urgenzaDomani <= 2 ? 'Bassa — si può rimandare' :
                 urgenzaDomani === 3 ? 'Media — da fare domani' :
                 urgenzaDomani === 4 ? 'Alta — priorità' :
                 'Urgentissimo — non rimandare'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-emerald-900 mb-1">
                Ore stimate per il lavoro
              </label>
              <div className="flex gap-2 flex-wrap">
                {['2', '4', '6', '8'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setStimeOreDomani(stimaOreDomani === v ? '' : v)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                      stimaOreDomani === v
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {v}h
                  </button>
                ))}
                <input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={stimaOreDomani}
                  onChange={e => setStimeOreDomani(e.target.value)}
                  placeholder="Ore"
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50"
      >
        {pending ? 'Invio in corso…' : '✅ Invia rapportino e chiudi giornata'}
      </button>
    </form>
  )
}
