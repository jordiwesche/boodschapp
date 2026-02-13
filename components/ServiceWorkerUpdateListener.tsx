'use client'

import { useEffect } from 'react'

/** Build-versie van de huidige pagina (ingebakken bij build) */
const OUR_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev'

/**
 * Herlaad de pagina wanneer een nieuwe deploy beschikbaar is.
 * - Browser: controllerchange (SW update)
 * - PWA standalone: versie-check met server (SW update werkt daar vaak niet)
 * Gebruiker blijft ingelogd (cookie/sessie blijft).
 */
export default function ServiceWorkerUpdateListener() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let refreshing = false

    const reload = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    // 1. SW controllerchange (werkt in browser)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', reload)
    }

    // 2. Versie-check: vergelijk onze ingebakken versie met server (werkt in PWA standalone)
    const checkVersion = async () => {
      if (OUR_VERSION === 'dev') return
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json()
        if (!version || version === 'dev') return

        // Server heeft andere versie = nieuwe deploy, wij draaien nog oude code
        if (version !== OUR_VERSION) {
          reload()
        }
      } catch {
        // ignore
      }
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => reg.update())
      }
      checkVersion()
    }

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) checkVersion()
    }

    checkVersion()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', reload)
      }
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return null
}
