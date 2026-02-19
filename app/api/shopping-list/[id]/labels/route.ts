import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/shopping-list/[id]/labels - Set labels on item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const { label_ids } = body as { label_ids?: string[] }

    if (!Array.isArray(label_ids)) {
      return NextResponse.json({ error: 'label_ids moet een array zijn' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'Kon huishouden niet vinden' }, { status: 400 })
    }

    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .select('id, household_id')
      .eq('id', itemId)
      .eq('household_id', user.household_id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 })
    }

    // Fetch all labels for household to validate and enforce smart label mutual exclusivity
    const { data: householdLabels, error: labelsError } = await supabase
      .from('labels')
      .select('id, slug, type')
      .eq('household_id', user.household_id)

    if (labelsError || !householdLabels) {
      return NextResponse.json({ error: 'Kon labels niet ophalen' }, { status: 500 })
    }

    const labelMap = new Map(householdLabels.map((l) => [l.id, l]))

    // Validate: all label_ids must belong to household
    const validLabelIds = label_ids.filter((lid) => labelMap.has(lid))

    // Enforce mutual exclusivity for smart labels: only one of zsm/later
    const selectedSmartLabels = validLabelIds
      .map((lid) => labelMap.get(lid))
      .filter((l): l is { id: string; slug: string; type: string } => l != null && l.type === 'smart')

    const hasZsm = selectedSmartLabels.some((l) => l.slug === 'zsm')
    const hasLater = selectedSmartLabels.some((l) => l.slug === 'later')

    let finalLabelIds = [...validLabelIds]
    if (hasZsm && hasLater) {
      // Keep only the last one added (simplification: keep zsm if both present)
      const zsmLabel = householdLabels.find((l) => l.slug === 'zsm')
      const laterLabel = householdLabels.find((l) => l.slug === 'later')
      finalLabelIds = validLabelIds.filter(
        (lid) => lid !== (laterLabel?.id ?? '')
      )
      if (finalLabelIds.length === 0 && zsmLabel) finalLabelIds = [zsmLabel.id]
    }

    // Replace all item labels
    const { error: deleteError } = await supabase
      .from('shopping_list_item_labels')
      .delete()
      .eq('item_id', itemId)

    if (deleteError) {
      console.error('Delete item labels error:', deleteError)
      return NextResponse.json({ error: 'Kon labels niet bijwerken' }, { status: 500 })
    }

    if (finalLabelIds.length > 0) {
      const rows = finalLabelIds.map((label_id) => ({ item_id: itemId, label_id }))
      const { error: insertError } = await supabase
        .from('shopping_list_item_labels')
        .insert(rows)

      if (insertError) {
        console.error('Insert item labels error:', insertError)
        return NextResponse.json({ error: 'Kon labels niet bijwerken' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, label_ids: finalLabelIds })
  } catch (error) {
    console.error('Set item labels error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
