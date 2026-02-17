'use client'

import { QueryClient } from '@tanstack/react-query'

// Configure QueryClient with optimal cache settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
      gcTime: 30 * 60 * 1000, // 30 minutes - keep cached data longer for instant tab switch
      refetchOnWindowFocus: false, // Don't refetch on window focus (we use Realtime)
      refetchOnMount: true, // Refetch when component mounts (background update)
      retry: 1, // Retry failed requests once
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
})
