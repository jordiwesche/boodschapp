/**
 * Session persistence for Safari PWA - cookies can be cleared when app is closed.
 * Cache API persists better in standalone mode on iOS.
 */

const SESSION_CACHE_NAME = 'boodschapp-session'
const SESSION_KEY = '/session'

export async function saveSessionToCache(userId: string): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(SESSION_CACHE_NAME)
    await cache.put(
      SESSION_KEY,
      new Response(JSON.stringify({ user_id: userId }), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
  } catch {
    // Ignore - Cache API might not be available
  }
}

export async function getSessionFromCache(): Promise<string | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(SESSION_CACHE_NAME)
    const response = await cache.match(SESSION_KEY)
    if (!response) return null
    const data = await response.json()
    return data?.user_id ?? null
  } catch {
    return null
  }
}

export async function clearSessionFromCache(): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(SESSION_CACHE_NAME)
    await cache.delete(SESSION_KEY)
  } catch {
    // Ignore
  }
}
