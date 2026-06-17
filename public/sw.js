// QUADRO Service Worker — PWA offline support + push notifications

const CACHE = 'quadro-v1'
const PRECACHE = ['/', '/login', '/operaio/dashboard', '/offline.html']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(PRECACHE).catch(() => {})
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Solo richieste GET same-origin
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // API Next.js → network-first, fallback offline
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
    return
  }

  // Pagine → network-first con cache fallback
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(cache => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request) ?? caches.match('/offline.html'))
  )
})

// ORDINE 4 — Push notification handler
// Attivo quando VAPID è configurato e l'utente ha dato il consenso
self.addEventListener('push', event => {
  let data = { title: 'QUADRO', body: 'Hai una notifica', url: '/operaio/dashboard' }
  try { data = JSON.parse(event.data?.text() ?? '{}') } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'QUADRO', {
      body: data.body ?? '',
      icon: '/manifest-icon-192.png',
      badge: '/manifest-icon-72.png',
      data: { url: data.url },
      requireInteraction: true,  // notifica non sparisce finché l'utente non clicca
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/operaio/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); existing.navigate(url) }
      else clients.openWindow(url)
    })
  )
})
