'use client'

import { useEffect, useState } from 'react'
import { countPending } from '@/lib/offline-queue'

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    setOffline(!navigator.onLine)
    countPending().then(setPending).catch(() => {})

    const onOffline = () => setOffline(true)
    const onOnline = () => {
      setOffline(false)
      countPending().then(setPending).catch(() => {})
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (!offline && pending === 0) return null

  return (
    <div className={`px-4 py-2 text-center text-sm font-medium ${offline ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-700'}`}>
      {offline
        ? '📡 Sei offline — le giornate verranno salvate e sincronizzate al ritorno della connessione'
        : `🔄 ${pending} giornata${pending > 1 ? 'e' : ''} in attesa di sincronizzazione`}
    </div>
  )
}
