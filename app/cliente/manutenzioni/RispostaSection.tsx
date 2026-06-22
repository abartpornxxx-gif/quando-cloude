'use client'

import { useRef, useActionState } from 'react'
import { rispondiPropostaCliente, type RispostaState } from './actions'

interface Props {
  propostaId: string
}

export function RispostaSection({ propostaId }: Props) {
  const aczioneRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState<RispostaState, FormData>(
    rispondiPropostaCliente,
    {},
  )

  const handleClick = (azione: 'accetta' | 'rifiuta') => {
    if (aczioneRef.current) aczioneRef.current.value = azione
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3 pt-2">
      <input type="hidden" name="propostaId" value={propostaId} />
      <input type="hidden" name="azione" ref={aczioneRef} defaultValue="" />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <textarea
        name="rispostaCliente"
        rows={2}
        disabled={isPending}
        placeholder="Nota opzionale (es. preferenza sulla data, contatti)…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none disabled:opacity-60"
      />

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleClick('accetta')}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? '…' : '✓ Accetta'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleClick('rifiuta')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          Non adesso
        </button>
      </div>
    </form>
  )
}
