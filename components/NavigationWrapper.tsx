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

  if (hideNavigation) {
    return null
  }

  return <BottomNavigation />
}
