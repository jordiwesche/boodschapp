'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import BottomNavigation from './BottomNavigation'
import ShoppingListPage from './ShoppingListPage'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/hooks/use-shopping-list'
import { prefetchWeekmenu } from '@/components/WeekmenuPage'
import { prefetchProfile } from '@/components/ProfielTabContent'

const WeekmenuPage = dynamic(() => import('@/components/WeekmenuPage'), {
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  ),
})

const ProfielTabContent = dynamic(() => import('@/components/ProfielTabContent'), {
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  ),
})

const ProductenTabContent = dynamic(() => import('@/components/ProductenTabContent'), {
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  ),
})

type TabId = 'lijst' | 'weekmenu' | 'producten' | 'profiel'

const PATH_TO_TAB: Record<string, TabId> = {
  '/': 'lijst',
  '/weekmenu': 'weekmenu',
  '/producten': 'producten',
  '/profiel': 'profiel',
}

const TAB_TO_PATH: Record<TabId, string> = {
  lijst: '/',
  weekmenu: '/weekmenu',
  producten: '/producten',
  profiel: '/profiel',
}

export default function AppShell({ initialTab }: { initialTab: TabId }) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const queryClient = useQueryClient()

  // Sync tab from URL (e.g. browser back)
  useEffect(() => {
    const tab = PATH_TO_TAB[pathname]
    if (tab) setActiveTab(tab)
  }, [pathname])

  // Prefetch data on mount so tabs have content ready when opened
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: queryKeys.shoppingListItems })
    prefetchWeekmenu()
    prefetchProfile()
  }, [queryClient])

  const handleTabChange = (path: '/' | '/weekmenu' | '/producten' | '/profiel') => {
    const tab = PATH_TO_TAB[path]
    if (tab == null) return
    setActiveTab(tab)
    window.history.replaceState(null, '', path)
  }

  return (
    <>
      {activeTab === 'lijst' && <ShoppingListPage />}
      {activeTab === 'weekmenu' && (
        <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
          <header className="bg-transparent">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">Weekmenu</h1>
            </div>
          </header>
          <WeekmenuPage />
        </div>
      )}
      {activeTab === 'producten' && <ProductenTabContent />}
      {activeTab === 'profiel' && <ProfielTabContent />}
      <BottomNavigation onTabChange={handleTabChange} />
    </>
  )
}
