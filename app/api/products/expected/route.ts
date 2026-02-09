import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PurchaseHistory } from '@/types/database'
import {
  calculatePurchaseFrequency,
  getLastPurchaseDate,
  predictNextPurchaseDate,
} from '@/lib/prediction'

export const dynamic = 'force-dynamic'

/** GET /api/products/expected - Top 5 products due to buy (by frequency + last purchased) */
export async function GET() {
  try {
    const { cookies } = await import('next/headers')
    const userId = (await cookies()).get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user?.household_id) {
      return NextResponse.json({ expected: [] })
    }

    const householdId = user.household_id

    // All purchase history for household
    const { data: historyRows, error: historyError } = await supabase
      .from('purchase_history')
      .select('id, household_id, product_id, purchased_at, added_by, created_at')
      .eq('household_id', householdId)
      .order('purchased_at', { ascending: false })

    if (historyError || !historyRows?.length) {
      return NextResponse.json({ expected: [] })
    }

    // Group by product_id
    const byProduct = new Map<string, PurchaseHistory[]>()
    for (const row of historyRows) {
      const ph: PurchaseHistory = {
        id: row.id,
        household_id: row.household_id,
        product_id: row.product_id,
        shopping_list_item_id: null,
        purchased_at: row.purchased_at,
        added_by: row.added_by,
        created_at: row.created_at,
      }
      const list = byProduct.get(row.product_id) ?? []
      list.push(ph)
      byProduct.set(row.product_id, list)
    }

    // For each product: frequency, last date, next date; keep only with enough data
    type DueProduct = { product_id: string; nextPurchaseDate: Date; frequencyDays: number }
    const dueList: DueProduct[] = []

    for (const [productId, purchases] of byProduct) {
      const frequency = calculatePurchaseFrequency(purchases)
      if (frequency == null || frequency <= 0) continue

      const lastDate = getLastPurchaseDate(purchases)
      if (!lastDate) continue

      const nextDate = predictNextPurchaseDate(lastDate, frequency)
      dueList.push({ product_id: productId, nextPurchaseDate: nextDate, frequencyDays: frequency })
    }

    // Sort by next purchase date ascending (most due first)
    dueList.sort(
      (a, b) => a.nextPurchaseDate.getTime() - b.nextPurchaseDate.getTime()
    )

    const top5 = dueList.slice(0, 5)
    const productIds = top5.map((p) => p.product_id)
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const dueDaysByProductId = new Map(
      top5.map((p) => [
        p.product_id,
        Math.max(0, Math.ceil((p.nextPurchaseDate.getTime() - now) / oneDayMs)),
      ])
    )

    if (productIds.length === 0) {
      return NextResponse.json({ expected: [] })
    }

    // Exclude products already on the list (unchecked)
    const { data: listItems } = await supabase
      .from('shopping_list_items')
      .select('product_id')
      .eq('household_id', householdId)
      .eq('is_checked', false)
      .in('product_id', productIds)

    const onListIds = new Set((listItems ?? []).map((r) => r.product_id).filter(Boolean))
    const idsToReturn = productIds.filter((id) => !onListIds.has(id))

    if (idsToReturn.length === 0) {
      return NextResponse.json({ expected: [] })
    }

    // Fetch products with category
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        emoji,
        category_id,
        product_categories (
          id,
          name,
          display_order
        )
      `)
      .eq('household_id', householdId)
      .in('id', idsToReturn)

    if (productsError || !products?.length) {
      return NextResponse.json({ expected: [] })
    }

    // Preserve order of idsToReturn
    const orderMap = new Map(idsToReturn.map((id, i) => [id, i]))
    const sorted = [...products].sort(
      (a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99)
    )

    const expected = sorted.map((p) => {
      const cat = Array.isArray(p.product_categories) ? p.product_categories[0] : p.product_categories
      return {
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        category_id: p.category_id,
        category: cat
          ? { id: cat.id, name: cat.name, display_order: cat.display_order }
          : null,
        days_until_expected: dueDaysByProductId.get(p.id) ?? 0,
      }
    })

    return NextResponse.json({ expected })
  } catch (error) {
    console.error('Expected products error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
