import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictCategoryAndEmoji } from '@/lib/predict-category-emoji'

/** Normalize category name for matching (lowercase, &/en unified, no extra spaces) */
function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, ' en ')
    .replace(/\s+/g, ' ')
}

/** Aliases for predicted category names so we find DB categories with different wording */
const CATEGORY_ALIASES: Record<string, string[]> = {
  'Groente & Fruit': ['Groente & Fruit', 'Fruit & Groente', 'Groente en Fruit', 'Fruit en Groente'],
  'Vlees & Vis': ['Vlees & Vis', 'Vlees en Vis'],
  'Brood & Bakkerij': ['Brood & Bakkerij', 'Brood en Bakkerij'],
  'Droge Kruidenierswaren': ['Droge Kruidenierswaren', 'Kruidenierswaren'],
  'Houdbare Producten': ['Houdbare Producten', 'Houdbare waren', 'Conserven'],
  'Persoonlijke Verzorging': ['Persoonlijke Verzorging', 'Verzorging'],
  'Huishoudelijke Artikelen': ['Huishoudelijke Artikelen', 'Huishoud'],
  'Overig': ['Overig'],
}

// POST /api/products/create - Create a new product
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, category_id, emoji } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Productnaam is verplicht' },
        { status: 400 }
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

    // If category_id not provided, predict it
    let finalCategoryId = category_id
    let finalEmoji = emoji

    if (!finalCategoryId) {
      const prediction = predictCategoryAndEmoji(name.trim())
      const predictedNormalized = normalizeCategoryName(prediction.categoryName)

      // Fetch all household categories and match by exact name, aliases, or normalized name
      const { data: categories, error: categoriesError } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('household_id', user.household_id)

      if (!categoriesError && categories && categories.length > 0) {
        // Try exact match first
        let found = categories.find((c) => c.name === prediction.categoryName)
        if (found) {
          finalCategoryId = found.id
        }
        // Try aliases
        if (!finalCategoryId) {
          const aliases = CATEGORY_ALIASES[prediction.categoryName]
          if (aliases) {
            for (const alias of aliases) {
              found = categories.find((c) => c.name === alias)
              if (found) {
                finalCategoryId = found.id
                break
              }
            }
          }
        }
        // Fallback: match by normalized name (Groente & Fruit vs Fruit & Groente)
        if (!finalCategoryId) {
          found = categories.find(
            (c) => normalizeCategoryName(c.name) === predictedNormalized
          )
          if (found) {
            finalCategoryId = found.id
          }
        }
      }

      if (!finalCategoryId) {
        // Fallback: find "Overig" category (from already-fetched list or single query)
        const overig =
          categories?.find(
            (c) => c.name === 'Overig' || normalizeCategoryName(c.name) === 'overig'
          ) ?? null
        if (overig) {
          finalCategoryId = overig.id
        } else {
          const { data: overigRow } = await supabase
            .from('product_categories')
            .select('id')
            .eq('household_id', user.household_id)
            .eq('name', 'Overig')
            .single()
          if (overigRow) {
            finalCategoryId = overigRow.id
          }
        }
      }

      if (!finalEmoji) {
        finalEmoji = prediction.emoji
      }
    }

    if (!finalCategoryId) {
      return NextResponse.json(
        { error: 'Kon categorie niet vinden' },
        { status: 400 }
      )
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        household_id: user.household_id,
        name: name.trim(),
        emoji: finalEmoji || '📦',
        category_id: finalCategoryId,
      })
      .select()
      .single()

    if (productError) {
      console.error('Create product error:', productError)
      return NextResponse.json(
        { error: 'Kon product niet aanmaken' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        emoji: product.emoji,
        category_id: product.category_id,
      },
    })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
