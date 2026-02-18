'use client'

import { useQuery } from '@tanstack/react-query'

export const householdQueryKey = ['current-user-household'] as const

export function useHouseholdId() {
  const query = useQuery({
    queryKey: householdQueryKey,
    queryFn: async (): Promise<string> => {
      const res = await fetch('/api/user/current')
      if (!res.ok) throw new Error('Not authenticated')
      const data = await res.json()
      if (!data.household_id) throw new Error('No household assigned')
      return data.household_id
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  return {
    ...query,
    householdId: query.data ?? null,
  }
}
