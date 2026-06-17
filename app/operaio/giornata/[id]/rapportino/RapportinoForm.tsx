'use client'

import { useState, useTransition } from 'react'
import { inviaRapportino } from './actions'

type Attrezzatura = { id: string; nome: string }

interface Props {
  giornataId: string
  attrezzatureUsate: Attrezzatura[]
}

export default function RapportinoForm({ giornataId, attrezzatureUsate }: Props) {
  const [lavoroEseguito, setLavoroEseguito] = useState('')
  const [lavoriExtra, setLavoriExtra] = useState('')
  const [noteAttrezzatura, setNoteAttrezzatura] = useState('')
  const [noteGiornoSuccessivo, setNoteGiornoSuccessivo] = useState('')
  const [oreOrdinarie, setOreOrdinarie] = useState('8')
  const [oreStraordinarie, setOreStraordinarie] = useState('0')
  const [attrRiconsegnate, setAttrRiconsegnate] = useState<string[]>(
    attrezzatureUsate.map(a => a.id) // di default tutte riconsegnate
  )
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  function toggleAttr(id: string) {
    setAttrRiconsegnate(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lavoroEseguito.trim()) { setErrore('Descrivi il lavoro eseguito'); return }
    const ore = parseFloat(oreOrdinarie) || 0
    const oreSt = parseFloat(oreStraordinarie) || 0
    if (ore <= 0 && oreSt <= 0) { setErrore('Inserisci almeno le ore lavorate'); return }
    setErrore('')
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
