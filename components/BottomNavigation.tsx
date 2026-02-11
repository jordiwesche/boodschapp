'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, Calendar, Package, User } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { haptic } from '@/lib/haptics'

type TabPath = '/' | '/weekmenu' | '/producten' | '/profiel'

export default function BottomNavigation({
  onTabChange,
}: {
  /** When set, tab click calls this instead of router.push (instant tab switch). */
  onTabChange?: (path: TabPath) => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const prevPathnameRef = useRef(pathname)

  const navItems: { label: string; icon: typeof ShoppingCart; path: TabPath }[] = [
    {
      label: 'Lijst',
      icon: ShoppingCart,
      path: '/',
    },
    {
      label: 'Weekmenu',
      icon: Calendar,
      path: '/weekmenu',
    },
    {
      label: 'Producten',
      icon: Package,
      path: '/producten',
    },
    {
      label: 'Profiel',
      icon: User,
      path: '/profiel',
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  // Animate active indicator transition
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      // Find active button and animate
      const activeButton = document.querySelector(
        '[data-nav-active="true"]'
      ) as HTMLElement
      if (activeButton) {
        // Use CSS transition for simple scale animation
        activeButton.style.transition = 'transform 0.2s ease-out'
        activeButton.style.transform = 'scale(1.1)'
        setTimeout(() => {
          activeButton.style.transform = 'scale(1)'
        }, 200)
      }
      prevPathnameRef.current = pathname
    }
  }, [pathname])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <button
              key={item.path}
              onClick={() => {
                haptic('light')
                if (onTabChange) {
                  onTabChange(item.path)
                } else {
                  router.push(item.path)
                }
              }}
              onMouseEnter={() => router.prefetch(item.path)}
              data-nav-active={active}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label={item.label}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
