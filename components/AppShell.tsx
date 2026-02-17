'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import BottomNavigation from './BottomNavigation'
import ShoppingListPage from './ShoppingListPage'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/hooks/use-shopping-list'
import { prefetchProducts } from '@/lib/hooks/use-products'
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

export default function AppShell({ initialTab }: { initialTab: TabId }) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(() => new Set([initialTab]))
  const queryClient = useQueryClient()

  // Sync tab from URL (e.g. browser back)
  useEffect(() => {
    const tab = PATH_TO_TAB[pathname]
    if (tab) setActiveTab(tab)
  }, [pathname])

  // Keep tabs mounted once visited (never unmount) – instant content on tab switch
  useEffect(() => {
    setMountedTabs((prev) => new Set(prev).add(activeTab))
  }, [activeTab])

  // Prefetch data on mount so tabs have content ready when opened
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: queryKeys.shoppingListItems })
    prefetchProducts(queryClient)
    prefetchWeekmenu()
    prefetchProfile()
  }, [queryClient])

  // Preload tab chunks in background for instant tab switch (no loading spinner)
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/WeekmenuPage')
      import('@/components/ProductenTabContent')
      import('@/components/ProfielTabContent')
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleTabChange = (path: '/' | '/weekmenu' | '/producten' | '/profiel') => {
    const tab = PATH_TO_TAB[path]
    if (tab == null) return
    setActiveTab(tab)
    window.history.replaceState(null, '', path)
  }

  return (
    <>
      {mountedTabs.has('lijst') && (
        <div style={{ display: activeTab === 'lijst' ? 'block' : 'none' }}>
          <ShoppingListPage />
        </div>
      )}
      {mountedTabs.has('weekmenu') && (
        <div style={{ display: activeTab === 'weekmenu' ? 'block' : 'none' }}>
          <WeekmenuPage />
        </div>
      )}
      {mountedTabs.has('producten') && (
        <div style={{ display: activeTab === 'producten' ? 'block' : 'none' }}>
          <ProductenTabContent />
        </div>
      )}
      {mountedTabs.has('profiel') && (
        <div style={{ display: activeTab === 'profiel' ? 'block' : 'none' }}>
          <ProfielTabContent />
        </div>
      )}
      <BottomNavigation onTabChange={handleTabChange} />
    </>
  )
}
