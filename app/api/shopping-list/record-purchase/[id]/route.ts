import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculatePurchaseFrequency,
  getLastPurchaseDate,
} from '@/lib/prediction'
import { PurchaseHistory } from '@/types/database'

const EMA_ALPHA = 0.9
const RATIO_MIN = 0.7
const RATIO_MAX = 1.4

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
      .select('id, product_id, household_id, is_checked, checked_at, created_at, description, added_from_verwacht_at')
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

    // Smart detection: items with "check" label or "check" in description are not real purchases
    // (user is just checking if they have the item at home)
    const { data: itemLabels } = await supabase
      .from('shopping_list_item_labels')
      .select('label_id, labels!inner(slug)')
      .eq('item_id', id)
    const hasCheckLabel = itemLabels?.some((r: { labels: { slug: string } | { slug: string }[] }) => {
      const labels = r.labels
      return Array.isArray(labels) ? labels.some((l) => l.slug === 'check') : labels?.slug === 'check'
    })
    const description = (item.description || '').toLowerCase().trim()
    const hasCheckInDescription = /(?:^|[\s(])check(?:$|[\s)])/i.test(description)
    if (hasCheckLabel || hasCheckInDescription) {
      console.log(`⏭️ Skipped purchase history for product ${item.product_id}: check label or description`)
      return NextResponse.json({
        success: true,
        message: 'Item heeft check-label of "check" in toelichting, geen echte aankoop',
        skipped: true,
      })
    }

    // Smart detection: items checked within 10 minutes of being added are likely
    // not real purchases (accidentally added, already in stock, etc.)
    const MIN_TIME_ON_LIST_MS = 10 * 60 * 1000 // 10 minutes
    const checkedAt = item.checked_at ? new Date(item.checked_at).getTime() : Date.now()
    const createdAt = new Date(item.created_at).getTime()
    const timeOnListMs = checkedAt - createdAt

    if (timeOnListMs < MIN_TIME_ON_LIST_MS) {
      console.log(`⏭️ Skipped purchase history for product ${item.product_id}: item was on list for only ${Math.round(timeOnListMs / 1000)}s (< 10 min)`)
      return NextResponse.json({
        success: true,
        message: 'Item te snel afgevinkt na toevoegen, waarschijnlijk geen echte aankoop',
        skipped: true,
      })
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
      // Fetch history BEFORE insert (for EMA correction)
      const addedFromVerwacht = (item as { added_from_verwacht_at?: string | null }).added_from_verwacht_at
      let emaData: { frequency: number; lastDate: Date } | null = null

      if (addedFromVerwacht) {
        const { data: historyRows } = await supabase
          .from('purchase_history')
          .select('id, household_id, product_id, purchased_at, added_by, created_at')
          .eq('household_id', user.household_id)
          .eq('product_id', item.product_id)
          .order('purchased_at', { ascending: false })

        const purchaseHistory: PurchaseHistory[] = (historyRows || []).map((r) => ({
          id: r.id,
          household_id: r.household_id,
          product_id: r.product_id,
          shopping_list_item_id: null,
          purchased_at: r.purchased_at,
          added_by: r.added_by,
          created_at: r.created_at,
        }))

        const frequency = calculatePurchaseFrequency(purchaseHistory)
        const lastDate = getLastPurchaseDate(purchaseHistory)
        if (frequency != null && frequency >= 1 && lastDate) {
          emaData = { frequency, lastDate }
        }
      }

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

      // Apply EMA correction
      if (emaData) {
        const nowDate = new Date(now)
        const observedDays = (nowDate.getTime() - emaData.lastDate.getTime()) / (1000 * 60 * 60 * 24)
        const ratio = observedDays / emaData.frequency
        const clamped = Math.max(RATIO_MIN, Math.min(RATIO_MAX, ratio))

        const { data: product } = await supabase
          .from('products')
          .select('frequency_correction_factor')
          .eq('id', item.product_id)
          .single()

        const currentFactor = (product?.frequency_correction_factor ?? 1) as number
        const newFactor = EMA_ALPHA * currentFactor + (1 - EMA_ALPHA) * clamped

        await supabase
          .from('products')
          .update({ frequency_correction_factor: newFactor })
          .eq('id', item.product_id)
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
