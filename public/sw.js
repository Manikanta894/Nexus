const CACHE_NAME = 'nexus-v1'
const STATIC_ASSETS = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response.ok) { const clone = response.clone(); caches.open(CACHE_NAME).then((c) => c.put(event.request, clone)) }
        return response
      }).catch(() => cached)
      return cached || fetched
    })
  )
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'NEXUS Notification', body: 'New activity' }
  event.waitUntil(self.registration.showNotification(data.title || 'NEXUS', { body: data.body, icon: '/icon-192.png', badge: '/icon-192.png' }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clients) => {
    for (const c of clients) if ('focus' in c) return c.focus()
    return self.clients.openWindow('/')
  }))
})
