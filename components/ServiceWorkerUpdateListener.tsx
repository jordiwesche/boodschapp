'use client'

import { useEffect } from 'react'

/**
 * Herlaad de pagina wanneer een nieuwe service worker versie actief wordt (na deploy).
 * Gebruiker blijft ingelogd (cookie/sessie blijft), maar krijgt wel de nieuwe code.
 */
export default function ServiceWorkerUpdateListener() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let refreshing = false

    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // Check voor updates wanneer gebruiker terugkomt naar de tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update()
        })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return null
}
