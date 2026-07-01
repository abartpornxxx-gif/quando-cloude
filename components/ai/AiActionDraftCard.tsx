'use client'

import { useState } from 'react'
import type { ActionDraft } from '@/lib/ai/actions/types'

interface Props {
  draft: ActionDraft
  onConfirm: (draft: ActionDraft, editedPayload: Record<string, unknown>) => Promise<void>
  onRemove: (draftId: string) => void
  isConfirming?: boolean
  accentColor?: string
}

const RISK_STYLE: Record<string, string> = {
  LOW:    'bg-emerald-50 border-emerald-200 text-emerald-700',
  MEDIUM: 'bg-amber-50 border-amber-200 text-amber-700',
  HIGH:   'bg-red-50 border-red-200 text-red-700',
}

const RISK_LABEL: Record<string, string> = {
  LOW:    'Rischio basso',
  MEDIUM: 'Rischio medio',
  HIGH:   'Rischio alto — richiede attenzione',
}

// Classi Tailwind statiche per il tasto conferma (evita template literal non rilevati dal build)
const ACCENT_BTN: Record<string, string> = {
  blue:    'bg-blue-600 hover:bg-blue-700',
  teal:    'bg-teal-600 hover:bg-teal-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  amber:   'bg-amber-600 hover:bg-amber-700',
  violet:  'bg-violet-600 hover:bg-violet-700',
  orange:  'bg-orange-600 hover:bg-orange-700',
}

// Campi editabili a seconda del tipo di azione
const EDITABLE_FIELDS: Record<string, string[]> = {
  PROMEMORIA_CREATE:      ['titolo', 'dataOra', 'tipo', 'priorita', 'luogo', 'descrizione'],
  FOLLOWUP_CREATE:        ['titolo', 'dataOra', 'priorita', 'luogo', 'descrizione'],
  PROMEMORIA_RESCHEDULE:  ['nuovaDataOra'],
  RAPPORTINO_CREATE_DRAFT:['lavoroEseguito', 'lavoriExtra'],
  RAPPORTINO_ADD_NOTA:    ['nota'],
  MATERIALE_REQUEST_DRAFT:['descrizione', 'quantita', 'note'],
  MATERIALE_MARK_MANCANTE:['descrizione', 'note'],
  COMMESSA_CREATE_DRAFT:  ['nome', 'indirizzoCantiere', 'note'],
  CLIENTE_CREATE_DRAFT:   ['nome', 'telefono', 'email'],
  DOCUMENTO_REQUEST_DRAFT:['tipoDocumento', 'note'],
  CONTEGGIO_ADD_RIGA_DRAFT:['descrizione', 'quantita', 'prezzoUnitario'],
}

const FIELD_LABEL: Record<string, string> = {
  titolo: 'Titolo', dataOra: 'Data e ora', tipo: 'Tipo', priorita: 'Priorità',
  luogo: 'Luogo', descrizione: 'Descrizione', note: 'Note',
  nuovaDataOra: 'Nuova data e ora',
  lavoroEseguito: 'Lavoro eseguito', lavoriExtra: 'Lavori extra',
  nota: 'Nota', quantita: 'Quantità', prezzoUnitario: 'Prezzo unitario',
  nome: 'Nome', telefono: 'Telefono', email: 'Email',
  indirizzoCantiere: 'Indirizzo cantiere',
  tipoDocumento: 'Tipo documento',
}

function formatPayloadValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'dataOra' || key === 'nuovaDataOra') {
    try {
      return new Intl.DateTimeFormat('it-IT', {
        dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Rome',
      }).format(new Date(String(value)))
    } catch { return String(value) }
  }
  return String(value)
}

export function AiActionDraftCard({ draft, onConfirm, onRemove, isConfirming, accentColor = 'blue' }: Props) {
  const [editing, setEditing] = useState(false)
  const [localPayload, setLocalPayload] = useState<Record<string, unknown>>({ ...draft.payload })
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editableKeys = EDITABLE_FIELDS[draft.actionId] ?? Object.keys(draft.payload)
  const readonlyKeys = Object.keys(draft.payload).filter(k => !editableKeys.includes(k))

  async function handleConfirm() {
    setError(null)
    if (!draft.draftId) {
      setError('ID bozza mancante — ricarica la pagina e riprova.')
      return
    }
    try {
      await onConfirm(draft, localPayload)
      setConfirmed(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore durante la conferma')
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700">
        <span>✓</span>
        <span className="font-medium">{draft.label}</span>
        <span>— confermato e salvato.</span>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${draft.valid ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${draft.valid ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{draft.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_STYLE[draft.riskLevel]}`}>
            {RISK_LABEL[draft.riskLevel]}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(draft.draftId)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
          title="Rimuovi bozza"
        >
          ×
        </button>
      </div>

      {/* Validation warning */}
      {!draft.valid && (
        <div className="px-4 py-2 bg-red-50 text-xs text-red-700 border-b border-red-100">
          {draft.validationReason}
          {draft.validationSuggestion && <span className="ml-1 italic">— {draft.validationSuggestion}</span>}
        </div>
      )}

      {/* Payload */}
      <div className="px-4 py-3 space-y-2">
        {!editing ? (
          <>
            {Object.entries(localPayload)
              .filter(([k]) => !['testoOriginale', 'commessaId', 'clienteId', 'rapportinoId', 'promemoriaId', 'strutturaNodoId'].includes(k))
              .map(([key, val]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <span className="text-gray-500 shrink-0 w-32">{FIELD_LABEL[key] ?? key}:</span>
                  <span className="text-gray-900 font-medium">{formatPayloadValue(key, val)}</span>
                </div>
              ))}
          </>
        ) : (
          <div className="space-y-3">
            {editableKeys.filter(k => k in localPayload || editableKeys.includes(k)).map(key => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">
                  {FIELD_LABEL[key] ?? key}
                </label>
                {key === 'dataOra' || key === 'nuovaDataOra' ? (
                  <input
                    type="datetime-local"
                    value={localPayload[key] ? String(localPayload[key]).slice(0, 16) : ''}
                    onChange={e => setLocalPayload(p => ({ ...p, [key]: e.target.value + ':00' }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                ) : key === 'descrizione' || key === 'note' || key === 'lavoroEseguito' || key === 'lavoriExtra' || key === 'nota' ? (
                  <textarea
                    rows={3}
                    value={localPayload[key] ? String(localPayload[key]) : ''}
                    onChange={e => setLocalPayload(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  />
                ) : (
                  <input
                    type={key === 'quantita' || key === 'prezzoUnitario' ? 'number' : 'text'}
                    value={localPayload[key] ? String(localPayload[key]) : ''}
                    onChange={e => setLocalPayload(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                )}
              </div>
            ))}
            {/* Campi non editabili come informativi */}
            {readonlyKeys.length > 0 && (
              <div className="pt-1 border-t border-gray-100">
                {readonlyKeys.map(key => (
                  <div key={key} className="flex gap-2 text-xs text-gray-400">
                    <span>{FIELD_LABEL[key] ?? key}: {String(localPayload[key] ?? '—')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        {draft.valid ? (
          <>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming}
              className={`rounded-lg ${ACCENT_BTN[accentColor] ?? 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-1.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors`}
            >
              {isConfirming ? 'Salvataggio…' : 'Conferma'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(p => !p)}
              className="rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 text-sm transition-colors"
            >
              {editing ? 'Annulla modifica' : 'Modifica'}
            </button>
          </>
        ) : (
          <span className="text-xs text-red-600">Correggi i dati prima di confermare.</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(draft.draftId)}
          className="ml-auto rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 hover:text-red-500 px-3 py-1.5 text-sm transition-colors"
        >
          Rimuovi
        </button>
      </div>
    </div>
  )
}
