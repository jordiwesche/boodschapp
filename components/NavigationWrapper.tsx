'use client'

import { usePathname } from 'next/navigation'
import BottomNavigation from './BottomNavigation'
import { useSearch } from './SearchContext'

export default function NavigationWrapper() {
  const pathname = usePathname()
  const { isSearchActive } = useSearch()

  // Don't show navigation on login/onboarding/auth pages or when search is active
  const hideNavigation = 
    pathname.startsWith('/login') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth') ||
    isSearchActive

  if (hideNavigation) {
    return null
  }

  return <BottomNavigation />
}
