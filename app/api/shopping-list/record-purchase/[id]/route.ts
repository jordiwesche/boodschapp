import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/shopping-list/record-purchase/[id] - Record purchase history immediately on check (dedup via 1h window; cancel on quick uncheck)
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

    if (!item.product_id) {
      return NextResponse.json(
        { error: 'Item heeft geen gekoppeld product' },
        { status: 400 }
      )
    }

    // Check if there's a recent purchase (< 1 hour ago) for this product
    // This handles the case where user checks -> unchecks -> checks again within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentPurchases, error: purchaseHistoryError } = await supabase
      .from('purchase_history')
      .select('*')
      .eq('household_id', user.household_id)
      .eq('product_id', item.product_id)
      .gte('purchased_at', oneHourAgo) // Purchases within last hour
      .order('purchased_at', { ascending: false })
      .limit(1)

    if (purchaseHistoryError) {
      console.error('Error fetching purchase history:', purchaseHistoryError)
    }

    const now = new Date().toISOString()
    // If we found a purchase within the last hour, update it instead of creating new one
    // This handles: check -> uncheck -> check again within 1 hour (same purchase)
    const hasRecent = recentPurchases && recentPurchases.length > 0

    // Handle purchase history
    if (hasRecent && recentPurchases && recentPurchases.length > 0) {
      // Update existing recent purchase instead of creating new one
      // This handles: check -> uncheck -> check again within 1 hour (same purchase)
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
      
      console.log(`✅ Updated existing purchase history for product ${item.product_id} (within 1 hour)`)
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
