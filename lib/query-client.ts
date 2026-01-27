'use client'

import { QueryClient } from '@tanstack/react-query'

// Configure QueryClient with optimal cache settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus (we use Realtime)
      refetchOnMount: true, // Refetch when component mounts
      retry: 1, // Retry failed requests once
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
})
