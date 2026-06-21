'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  className?: string
  label?: string
}

export function LogoutButton({ className, label = 'Esci' }: Props) {
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    if (pending) return
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    // Hard redirect: il browser fa una nuova richiesta senza cookie di sessione.
    // Il middleware vede l'utente non autenticato e lascia passare a /login.
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      className={className}
    >
      {pending ? '…' : label}
    </button>
  )
}
