/* Anand Finco – service worker
 *
 * Deliberately minimal so it can never cause stale or wrong data:
 *  - Pages ALWAYS load from the network, so clients always get the latest version.
 *  - Nothing else is intercepted or cached: no app code, no Firebase / Firestore
 *    data, no logins, no /api calls, no portfolio or bank details.
 *  - Only if the phone is offline, a friendly offline page is shown instead of a
 *    browser error.
 *
 * To roll back at any time: delete this file's contents and replace with
 *   self.addEventListener('install',()=>self.skipWaiting());
 *   self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));
 */
const VERSION     = 'af-pwa-v1'
const CACHE       = VERSION + '-static'
const OFFLINE_URL = '/offline.html'
const PRECACHE    = [OFFLINE_URL, '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' })
        if (res && res.ok) await cache.put(url, res)
      } catch (e) { /* ignore – offline page is a nice-to-have */ }
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys.filter((k) => k.indexOf('af-pwa-') === 0 && k !== CACHE).map((k) => caches.delete(k))
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // Only handle page navigations. Everything else goes straight to the network untouched.
  if (req.method !== 'GET' || req.mode !== 'navigate') return

  event.respondWith((async () => {
    try {
      return await fetch(req)
    } catch (e) {
      const cache = await caches.open(CACHE)
      const offline = await cache.match(OFFLINE_URL)
      return offline || new Response('You are offline. Please check your internet connection.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
  })())
})
