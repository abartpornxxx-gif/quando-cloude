'use client'

import { useTransition } from 'react'

interface Props {
  action: () => Promise<void>
  label?: string
}

export function DeleteButton({ action, label = 'Elimina' }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (confirm('Sei sicuro di voler eliminare questo elemento?')) {
      startTransition(action)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  )
}
