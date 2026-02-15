import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/shopping-list/check/[id] - Check item (purchase history recorded after 30s delay)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user's household_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user || !user.household_id) {
      return NextResponse.json(
        { error: 'Kon huishouden niet vinden' },
        { status: 400 }
      )
    }

    // Get shopping list item
    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .select('id, product_id, household_id, is_checked')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item niet gevonden' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Update shopping list item
    const { data: updatedItem, error: updateError } = await supabase
      .from('shopping_list_items')
      .update({
        is_checked: true,
        checked_at: now,
        checked_by: userId,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update shopping list item error:', updateError)
      return NextResponse.json(
        { error: 'Kon item niet afvinken' },
        { status: 500 }
      )
    }

    // Purchase history will be recorded after 30 seconds delay (handled client-side)
    // This prevents accidental double-taps from being recorded immediately

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })
  } catch (error) {
    console.error('Check shopping list item error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
