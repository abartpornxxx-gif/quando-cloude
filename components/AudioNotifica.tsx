'use client'

import { useEffect, useRef } from 'react'

interface Props {
  count: number
}

export function AudioNotifica({ count }: Props) {
  const prevCount = useRef(count)

  useEffect(() => {
    // Se il conteggio delle notifiche aumenta, riproduci il suono in-app
    if (count > prevCount.current) {
      const audio = new Audio('/suoni/notifica.mp3')
      audio.play().catch(err => {
        // Fallback silenzioso se l'autoplay è bloccato dal browser
        console.log('[audio] Autoplay bloccato o non supportato:', err)
      })
    }
    prevCount.current = count
  }, [count])

  return null
}
