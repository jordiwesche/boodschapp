'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, Calendar, User } from 'lucide-react'

export default function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
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
