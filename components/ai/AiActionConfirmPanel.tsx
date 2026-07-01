'use client'

import { useState } from 'react'
import { AiActionDraftCard } from './AiActionDraftCard'
import type { ActionDraft } from '@/lib/ai/actions/types'

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
    if (!draft.draftId) throw new Error('Draft ID mancante — riprova.')
    setConfirming(draft.draftId)
    setGlobalError(null)
    try {
      const res = await fetch('/api/ai/actions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: draft.draftId, confirmedPayload: editedPayload }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Errore durante la conferma')
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
            className={`text-xs font-semibold text-${accentColor}-700 hover:text-${accentColor}-900 border border-${accentColor}-200 bg-${accentColor}-50 rounded-lg px-3 py-1 disabled:opacity-50`}
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
