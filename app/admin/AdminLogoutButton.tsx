'use client'

import { useRouter } from 'next/navigation'

export function AdminLogoutButton({ className }: { className?: string }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/pannello-auth', { method: 'DELETE' })
    router.push('/pannello')
  }

  return (
    <button onClick={handleLogout} className={className}>
      Esci
    </button>
  )
}
