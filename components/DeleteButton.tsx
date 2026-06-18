'use client'

import { useTransition } from 'react'

interface Props {
  action: () => Promise<void>
  label?: string
  confirmMessage?: string
  variant?: 'danger' | 'warning'
}

export function DeleteButton({ action, label = 'Elimina', confirmMessage, variant = 'danger' }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const msg = confirmMessage ?? 'Sei sicuro di voler eliminare questo elemento?'
    if (confirm(msg)) {
      startTransition(async () => {
        try {
          await action()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Errore durante l\'eliminazione'
          alert(message)
        }
      })
    }
  }

  const cls = variant === 'warning'
    ? 'text-sm font-medium text-amber-600 hover:text-amber-800 disabled:opacity-50'
    : 'text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50'

  return (
    <button onClick={handleClick} disabled={pending} className={cls}>
      {pending ? '…' : label}
    </button>
  )
}
