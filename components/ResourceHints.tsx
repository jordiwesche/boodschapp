'use client'

import { useEffect } from 'react'

export default function ResourceHints() {
  useEffect(() => {
    // Add resource hints dynamically for performance
    const hints = [
      { rel: 'preconnect', href: 'https://medmrhmuhghcozfydxov.supabase.co' },
      { rel: 'dns-prefetch', href: 'https://medmrhmuhghcozfydxov.supabase.co' },
    ]

    hints.forEach(({ rel, href }) => {
      const link = document.createElement('link')
      link.rel = rel
      link.href = href
      document.head.appendChild(link)
    })

    // Cleanup on unmount (optional, links can stay)
    return () => {
      hints.forEach(({ rel, href }) => {
        const existingLink = document.querySelector(`link[rel="${rel}"][href="${href}"]`)
        if (existingLink) {
          existingLink.remove()
        }
      })
    }
  }, [])

  return null
}
