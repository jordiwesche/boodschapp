'use client'

import { usePathname } from 'next/navigation'
import BottomNavigation from './BottomNavigation'

export default function NavigationWrapper() {
  const pathname = usePathname()

  // Don't show navigation on login/onboarding/auth pages
  const hideNavigation =
    pathname.startsWith('/login') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth')

  // Main tabs (/, /weekmenu, /profiel) render AppShell with its own nav; only show nav on sub-routes (e.g. /profiel/naam)
  const isMainTab = pathname === '/' || pathname === '/weekmenu' || pathname === '/profiel'
  if (hideNavigation || isMainTab) {
    return null
  }

  return <BottomNavigation />
}
