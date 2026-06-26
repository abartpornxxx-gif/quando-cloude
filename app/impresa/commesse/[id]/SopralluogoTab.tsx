'use client'

import { useState, useTransition } from 'react'
import { salvaSopralluogo } from './sopralluogo-actions'
import { formatData } from '@/lib/format'

interface Props {
  commessaId: string
  sopralluogo: any | null
}

export function SopralluogoTab({ commessaId, sopralluogo }: Props) {
  const [isEditing, setIsEditing] = useState(!sopralluogo)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    dataSopralluogo: sopralluogo?.dataSopralluogo ? new Date(sopralluogo.dataSopralluogo).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    referentePresente: sopralluogo?.referentePresente || '',
    indirizzo: sopralluogo?.indirizzo || '',
    noteTecniche: sopralluogo?.noteTecniche || '',
    materialiPrevisti: sopralluogo?.materialiPrevisti || '',
    criticita: sopralluogo?.criticita || '',
    istruzioniOperai: sopralluogo?.istruzioniOperai || '',
  })

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await salvaSopralluogo(commessaId, formData)
        setIsEditing(false)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      }
    })
  }

  if (!isEditing && sopralluogo) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Scheda Sopralluogo</h2>
            <p className="text-sm text-gray-500">I dati raccolti durante la fase di analisi del cantiere.</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            ✏️ Modifica
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Dati Generali</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Data Sopralluogo</p>
                <p className="text-sm font-semibold text-gray-900">{formatData(sopralluogo.dataSopralluogo)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Referente Presente</p>
                <p className="text-sm font-semibold text-gray-900">{sopralluogo.referentePresente}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Indirizzo Effettivo</p>
                <p className="text-sm font-semibold text-gray-900">{sopralluogo.indirizzo}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">Istruzioni per gli Operai (Visibili in App)</p>
            {sopralluogo.istruzioniOperai ? (
              <p className="text-sm font-medium text-amber-900 whitespace-pre-wrap">{sopralluogo.istruzioniOperai}</p>
            ) : (
              <p className="text-sm text-amber-600/70 italic">Nessuna istruzione inserita per gli operai.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Note Tecniche e Operative (Uso Interno)</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">Dettagli e Note</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{sopralluogo.noteTecniche || 'Nessuna nota.'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">Materiali Previsti</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{sopralluogo.materialiPrevisti || 'Nessun materiale specificato.'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-bold text-gray-800 mb-1">Criticità / Vincoli</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{sopralluogo.criticita || 'Nessuna criticità segnalata.'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">
            {sopralluogo ? 'Modifica Sopralluogo' : 'Nuovo Sopralluogo'}
          </h2>
          <p className="text-sm text-gray-500">Compila i dati raccolti sul cantiere.</p>
        </div>
        {sopralluogo && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Annulla
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Dati Generali</p>
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Data Sopralluogo *</label>
            <input
              type="date"
              required
              value={formData.dataSopralluogo}
              onChange={e => handleChange('dataSopralluogo', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Referente Presente *</label>
            <input
              type="text"
              required
              value={formData.referentePresente}
              onChange={e => handleChange('referentePresente', e.target.value)}
              placeholder="Es: Sig. Rossi (Proprietario)"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Indirizzo Effettivo *</label>
            <input
              type="text"
              required
              value={formData.indirizzo}
              onChange={e => handleChange('indirizzo', e.target.value)}
              placeholder="Via Roma 1, Milano"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Comunicazione Operai</p>
          
          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">Istruzioni Visibili all'Operaio</label>
            <p className="text-xs text-amber-700 mb-2">Queste note appariranno a tutto schermo sull'app dell'operaio prima di iniziare la giornata in questo cantiere.</p>
            <textarea
              value={formData.istruzioniOperai}
              onChange={e => handleChange('istruzioniOperai', e.target.value)}
              placeholder="Es: Attenzione ai tubi vecchi nel bagno, non fare rumore prima delle 9:00, parcheggiare sul retro..."
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all outline-none"
              rows={6}
            />
          </div>
        </div>

        <div className="md:col-span-2 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Note Ufficio</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Note Tecniche</label>
              <textarea
                value={formData.noteTecniche}
                onChange={e => handleChange('noteTecniche', e.target.value)}
                placeholder="Dettagli sullo stato dell'impianto..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Materiali Previsti</label>
              <textarea
                value={formData.materialiPrevisti}
                onChange={e => handleChange('materialiPrevisti', e.target.value)}
                placeholder="Elenco di massima dei materiali necessari..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-800 mb-1">Criticità / Vincoli Particolari</label>
              <textarea
                value={formData.criticita}
                onChange={e => handleChange('criticita', e.target.value)}
                placeholder="Vincoli architettonici, permessi condominiali..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-premium transition-all hover:bg-blue-700 hover-lift active-press disabled:opacity-50"
        >
          {pending ? 'Salvataggio...' : 'Salva Sopralluogo'}
        </button>
      </div>
    </form>
  )
}
