'use client'

import { useState } from 'react'
import { AiActionDraftCard } from './AiActionDraftCard'
import type { ActionDraft } from '@/lib/ai/actions/types'

// Classi Tailwind statiche per il banner "Conferma tutte" (evita template literal invisibili al build)
const ACCENT_PANEL: Record<string, string> = {
  blue:    'text-blue-700 hover:text-blue-900 border-blue-200 bg-blue-50',
  teal:    'text-teal-700 hover:text-teal-900 border-teal-200 bg-teal-50',
  emerald: 'text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50',
  amber:   'text-amber-700 hover:text-amber-900 border-amber-200 bg-amber-50',
  violet:  'text-violet-700 hover:text-violet-900 border-violet-200 bg-violet-50',
  orange:  'text-orange-700 hover:text-orange-900 border-orange-200 bg-orange-50',
}

interface Props {
  drafts: ActionDraft[]
  onAllConfirmed?: () => void
  accentColor?: string
}

export function AiActionConfirmPanel({ drafts: initialDrafts, onAllConfirmed, accentColor = 'blue' }: Props) {
  const [drafts, setDrafts] = useState<ActionDraft[]>(initialDrafts)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [allDone, setAllDone] = useState(false)

  function removeDraft(draftId: string) {
    setDrafts(p => {
      const next = p.filter(d => d.draftId !== draftId)
      if (next.length === 0) onAllConfirmed?.()
      return next
    })
  }

  async function confirmSingle(draft: ActionDraft, editedPayload: Record<string, unknown>) {
    if (!draft.draftId) throw new Error('ID bozza mancante — ricarica la pagina e riprova.')
    setConfirming(draft.draftId)
    setGlobalError(null)
    try {
      const res = await fetch('/api/ai/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: draft.draftId, confirmedPayload: editedPayload }),
      })
      if (res.status === 401 || res.redirected) {
        throw new Error('Sessione scaduta. Effettua di nuovo il login.')
      }
      let data: { success?: boolean; error?: string; message?: string }
      try {
        data = await res.json()
      } catch {
        throw new Error('Non sono riuscito a salvare l\'azione. Riprova o controlla i dati.')
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Non sono riuscito a salvare l\'azione. Riprova o controlla i dati.')
      }
      removeDraft(draft.draftId)
    } finally {
      setConfirming(null)
    }
  }

  async function confirmAll() {
    setGlobalError(null)
    const validDrafts = drafts.filter(d => d.valid)
    for (const draft of validDrafts) {
      setConfirming(draft.draftId)
      try {
        await confirmSingle(draft, draft.payload)
      } catch (e: unknown) {
        setGlobalError(e instanceof Error ? e.message : 'Errore durante la conferma multipla')
        break
      }
    }
    setConfirming(null)
    if (drafts.every(d => !d.valid)) onAllConfirmed?.()
  }

  if (allDone || drafts.length === 0) {
    return (
      <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
        Tutte le azioni sono state confermate.
      </div>
    )
  }

  const validCount = drafts.filter(d => d.valid).length

  return (
    <div className="space-y-3">
      {/* Header panel */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {drafts.length === 1 ? 'Bozza azione' : `${drafts.length} bozze azioni`}
        </p>
        {drafts.length > 1 && validCount > 0 && (
          <button
            type="button"
            onClick={confirmAll}
            disabled={confirming !== null}
            className={`text-xs font-semibold border rounded-lg px-3 py-1 disabled:opacity-50 ${ACCENT_PANEL[accentColor] ?? 'text-blue-700 hover:text-blue-900 border-blue-200 bg-blue-50'}`}
          >
            {confirming ? 'Conferma in corso…' : `Conferma tutte (${validCount})`}
          </button>
        )}
      </div>

      {/* Error globale */}
      {globalError && (
        <div className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-2 border border-red-200">
          {globalError}
        </div>
      )}

      {/* Draft cards */}
      {drafts.map(d => (
        <AiActionDraftCard
          key={d.draftId || d.actionId}
          draft={d}
          onConfirm={confirmSingle}
          onRemove={removeDraft}
          isConfirming={confirming === d.draftId}
          accentColor={accentColor}
        />
      ))}
    </div>
  )
}
