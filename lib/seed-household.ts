import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Kopieert categorieën en producten van een bron-huishouden naar een nieuw huishouden.
 * Gebruikt SEED_HOUSEHOLD_ID uit env als bron. Als niet gezet, wordt er niets gekopieerd.
 * Gebruikt service role voor volledige database-toegang.
 */
export async function copyHouseholdDataFromSeed(
  targetHouseholdId: string
): Promise<{ categories: number; products: number }> {
  const sourceHouseholdId = process.env.SEED_HOUSEHOLD_ID?.trim()
  if (!sourceHouseholdId) {
    console.log('[seed-household] SEED_HOUSEHOLD_ID niet gezet, skip')
    return { categories: 0, products: 0 }
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (err) {
    console.error('[seed-household] Admin client error:', err)
    return { categories: 0, products: 0 }
  }
  console.log('[seed-household] Kopieer van', sourceHouseholdId, 'naar', targetHouseholdId)

  // Haal categorieën op van bron (gesorteerd op display_order)
  const { data: sourceCategories, error: catError } = await supabase
    .from('product_categories')
    .select('id, name, display_order')
    .eq('household_id', sourceHouseholdId)
    .order('display_order', { ascending: true })

  if (catError) {
    console.error('[seed-household] Categorieën ophalen error:', catError)
    return { categories: 0, products: 0 }
  }
  if (!sourceCategories?.length) {
    console.log('[seed-household] Geen categorieën in bron-huishouden')
    return { categories: 0, products: 0 }
  }
  console.log('[seed-household] Gevonden:', sourceCategories.length, 'categorieën')

  // Map: old category id -> new category id
  const categoryIdMap = new Map<string, string>()

  // Voeg categorieën toe aan nieuw huishouden
  for (const cat of sourceCategories) {
    const { data: newCat, error: insertError } = await supabase
      .from('product_categories')
      .insert({
        household_id: targetHouseholdId,
        name: cat.name,
        display_order: cat.display_order,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[seed-household] Categorie insert error:', cat.name, insertError)
    } else if (newCat) {
      categoryIdMap.set(cat.id, newCat.id)
    }
  }

  if (categoryIdMap.size === 0) {
    console.error('[seed-household] Geen categorieën gekopieerd')
    return { categories: 0, products: 0 }
  }

  // Haal producten op van bron
  const { data: sourceProducts, error: prodError } = await supabase
    .from('products')
    .select('emoji, name, description, category_id, is_basic, is_popular')
    .eq('household_id', sourceHouseholdId)

  if (prodError) {
    console.error('[seed-household] Producten ophalen error:', prodError)
    return { categories: categoryIdMap.size, products: 0 }
  }
  if (!sourceProducts?.length) {
    console.log('[seed-household] Geen producten in bron-huishouden')
    return { categories: categoryIdMap.size, products: 0 }
  }
  console.log('[seed-household] Gevonden:', sourceProducts.length, 'producten')

  let productsInserted = 0
  for (const prod of sourceProducts) {
    const newCategoryId = categoryIdMap.get(prod.category_id)
    if (!newCategoryId) continue

    const { error: prodInsertError } = await supabase.from('products').insert({
      household_id: targetHouseholdId,
      emoji: prod.emoji ?? '📦',
      name: prod.name,
      description: prod.description ?? null,
      category_id: newCategoryId,
      is_basic: prod.is_basic ?? false,
      is_popular: prod.is_popular ?? false,
    })

    if (prodInsertError) {
      console.error('[seed-household] Product insert error:', prod.name, prodInsertError)
    } else {
      productsInserted++
    }
  }

  console.log('[seed-household] Klaar:', categoryIdMap.size, 'categorieën,', productsInserted, 'producten gekopieerd')
  return { categories: categoryIdMap.size, products: productsInserted }
}
