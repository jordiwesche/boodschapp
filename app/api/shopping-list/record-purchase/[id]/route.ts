import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRecentPurchase } from '@/lib/prediction'

// POST /api/shopping-list/record-purchase/[id] - Record purchase history after 30 second delay
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

    // Get shopping list item to verify it's still checked
    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .select('id, product_id, household_id, is_checked, checked_at')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item niet gevonden' },
        { status: 404 }
      )
    }

    // Only record purchase history if item is still checked
    if (!item.is_checked) {
      return NextResponse.json({
        success: true,
        message: 'Item is niet meer afgevinkt, purchase history niet geregistreerd',
      })
    }

    // Verify at least 30 seconds have passed since checked_at
    // Note: We allow a small buffer (28 seconds) to account for network latency
    if (item.checked_at) {
      const checkedAt = new Date(item.checked_at).getTime()
      const now = Date.now()
      const diffSeconds = (now - checkedAt) / 1000

      if (diffSeconds < 28) {
        console.warn(`Purchase history recording too early for item ${id}: ${diffSeconds.toFixed(1)}s < 30s`)
        return NextResponse.json({
          success: false,
          message: `Nog niet 30 seconden verstreken (${diffSeconds.toFixed(1)}s)`,
        }, { status: 400 })
      }
    } else {
      // If checked_at is null, we can't verify the delay, but we'll still record it
      // This handles edge cases where checked_at might not be set
      console.warn(`Item ${id} has no checked_at timestamp, recording purchase history anyway`)
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

    // Handle purchase history
    if (hasRecent && recentPurchases && recentPurchases.length > 0) {
      // Update existing recent purchase instead of creating new one
      const { error: updatePurchaseError } = await supabase
        .from('purchase_history')
        .update({
          purchased_at: now,
          shopping_list_item_id: id,
          added_by: userId,
        })
        .eq('id', recentPurchases[0].id)

      if (updatePurchaseError) {
        console.error('Update purchase history error:', updatePurchaseError)
        return NextResponse.json(
          { error: 'Kon purchase history niet updaten' },
          { status: 500 }
        )
      }
    } else {
      // Create new purchase history entry
      const { error: insertError } = await supabase
        .from('purchase_history')
        .insert({
          household_id: user.household_id,
          product_id: item.product_id,
          shopping_list_item_id: id,
          purchased_at: now,
          added_by: userId,
        })

      if (insertError) {
        console.error('Insert purchase history error:', insertError)
        return NextResponse.json(
          { error: 'Kon purchase history niet aanmaken' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Record purchase history error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
