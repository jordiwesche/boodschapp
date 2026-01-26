import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRecentPurchase } from '@/lib/prediction'

// POST /api/shopping-list/check/[id] - Check item and log to purchase history
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      .eq('id', params.id)
      .eq('household_id', user.household_id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item niet gevonden' },
        { status: 404 }
      )
    }

    if (!item.product_id) {
      return NextResponse.json(
        { error: 'Item heeft geen gekoppeld product' },
        { status: 400 }
      )
    }

    // Check if there's a recent purchase (< 30 seconds ago) for this product
    const { data: recentPurchases, error: purchaseHistoryError } = await supabase
      .from('purchase_history')
      .select('*')
      .eq('household_id', user.household_id)
      .eq('product_id', item.product_id)
      .order('purchased_at', { ascending: false })
      .limit(1)

    if (purchaseHistoryError) {
      console.error('Error fetching purchase history:', purchaseHistoryError)
    }

    const now = new Date().toISOString()
    const hasRecent = recentPurchases && recentPurchases.length > 0
      ? hasRecentPurchase(recentPurchases, 30)
      : false

    // Update shopping list item
    const { data: updatedItem, error: updateError } = await supabase
      .from('shopping_list_items')
      .update({
        is_checked: true,
        checked_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update shopping list item error:', updateError)
      return NextResponse.json(
        { error: 'Kon item niet afvinken' },
        { status: 500 }
      )
    }

    // Handle purchase history
    if (hasRecent && recentPurchases && recentPurchases.length > 0) {
      // Update existing recent purchase instead of creating new one
      const { error: updatePurchaseError } = await supabase
        .from('purchase_history')
        .update({
          purchased_at: now,
          shopping_list_item_id: params.id,
          added_by: userId,
        })
        .eq('id', recentPurchases[0].id)

      if (updatePurchaseError) {
        console.error('Update purchase history error:', updatePurchaseError)
        // Don't fail the request, just log the error
      }
    } else {
      // Create new purchase history entry
      const { error: insertError } = await supabase
        .from('purchase_history')
        .insert({
          household_id: user.household_id,
          product_id: item.product_id,
          shopping_list_item_id: params.id,
          purchased_at: now,
          added_by: userId,
        })

      if (insertError) {
        console.error('Insert purchase history error:', insertError)
        // Don't fail the request, just log the error
      }
    }

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
