'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useHouseholdId } from './use-household'
import { queryKeys, type ShoppingListItemData } from './use-shopping-list'

export interface Label {
  id: string
  name: string
  color: string
  type: 'smart' | 'custom'
  slug: string | null
  display_order: number
  usage_count: number
}

export const labelQueryKeys = {
  labels: ['labels'] as const,
}

async function fetchLabels(householdId: string): Promise<Label[]> {
  const supabase = createClient()

  const { data: labels, error } = await supabase
    .from('labels')
    .select('id, name, color, type, slug, display_order, usage_count')
    .eq('household_id', householdId)
    .order('type', { ascending: true })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Fetch labels error:', error)
    throw new Error('Failed to fetch labels')
  }

  return (labels as Label[]) || []
}

export function useLabels() {
  const { householdId } = useHouseholdId()

  return useQuery({
    queryKey: [...labelQueryKeys.labels, householdId],
    queryFn: () => fetchLabels(householdId!),
    enabled: !!householdId,
    staleTime: 2 * 60 * 1000,
  })
}

function useLabelKey() {
  const { householdId } = useHouseholdId()
  return [...labelQueryKeys.labels, householdId] as const
}

function useListKey() {
  const { householdId } = useHouseholdId()
  return [...queryKeys.shoppingListItems, householdId] as const
}

export function useSetItemLabels() {
  const queryClient = useQueryClient()
  const labelKey = useLabelKey()
  const listKey = useListKey()

  return useMutation({
    mutationFn: async ({ itemId, labelIds }: { itemId: string; labelIds: string[] }) => {
      const supabase = createClient()

      // Delete existing labels and insert new ones in parallel where possible
      const { error: deleteError } = await supabase
        .from('shopping_list_item_labels')
        .delete()
        .eq('item_id', itemId)

      if (deleteError) throw new Error('Failed to update labels')

      if (labelIds.length > 0) {
        const rows = labelIds.map((label_id) => ({ item_id: itemId, label_id }))
        const { error: insertError } = await supabase
          .from('shopping_list_item_labels')
          .insert(rows)

        if (insertError) throw new Error('Failed to update labels')
      }

      return { label_ids: labelIds }
    },
    onMutate: async ({ itemId, labelIds }) => {
      await queryClient.cancelQueries({ queryKey: listKey })

      const previousItems = queryClient.getQueryData<ShoppingListItemData[]>(listKey)
      const allLabels = queryClient.getQueryData<Label[]>(labelKey)

      if (previousItems && allLabels) {
        const newLabels = labelIds
          .map((id) => allLabels.find((l) => l.id === id))
          .filter(Boolean)
          .map((l) => ({ id: l!.id, name: l!.name, color: l!.color, type: l!.type, slug: l!.slug }))

        queryClient.setQueryData<ShoppingListItemData[]>(
          listKey,
          previousItems.map((item) =>
            item.id === itemId ? { ...item, labels: newLabels } : item
          )
        )
      }

      return { previousItems }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(listKey, context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKey })
      queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
}
