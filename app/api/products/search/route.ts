import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchProductsWithScores } from '@/lib/search'
import { parseProductInput } from '@/lib/annotation-parser'
import { Product } from '@/types/database'

// GET /api/products/search - Search products with fuzzy matching
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        products: [],
      })
    }

    const supabase = await createClient()

    // Get user's household_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user || !user.household_id) {
      return NextResponse.json({
        products: [],
      })
    }

    // Get all products for household
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        emoji,
        name,
        description,
        category_id,
        is_basic,
        is_popular,
        created_at,
        updated_at,
        product_categories (
          id,
          name,
          display_order
        )
      `)
      .eq('household_id', user.household_id)

    if (productsError) {
      console.error('Get products error:', productsError)
      return NextResponse.json(
        { error: 'Kon producten niet ophalen' },
        { status: 500 }
      )
    }

    // Purchase counts for ranking (same product name match → higher count first)
    const productIds = (products || []).map((p: { id: string }) => p.id)
    let purchaseCountByProductId: Record<string, number> = {}
    if (productIds.length > 0) {
      const { data: rows } = await supabase
        .from('purchase_history')
        .select('product_id')
        .eq('household_id', user.household_id)
        .in('product_id', productIds)
      if (rows) {
        for (const row of rows) {
          const id = row.product_id
          purchaseCountByProductId[id] = (purchaseCountByProductId[id] ?? 0) + 1
        }
      }
    }

    // Fetch categories for household so we can attach category when join is empty
    const { data: categories } = await supabase
      .from('product_categories')
      .select('id, name, display_order')
      .eq('household_id', user.household_id)
    const categoryById = new Map((categories || []).map((c) => [c.id, c]))

    // Transform to Product type with purchase_count for sort
    const transformedProducts: (Product & { purchase_count?: number })[] = (products || []).map((product) => {
      const category = Array.isArray(product.product_categories) &&
        product.product_categories.length > 0
        ? product.product_categories[0]
        : null

      return {
        id: product.id,
        household_id: user.household_id,
        emoji: product.emoji,
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        is_basic: product.is_basic,
        is_popular: product.is_popular,
        created_at: product.created_at,
        updated_at: product.updated_at,
        purchase_count: purchaseCountByProductId[product.id] ?? 0,
      }
    })

    const queryTrimmed = query.trim()
    // Use product part for search: "4 appels" → search "appels" so we find "Appels" (leading number = description)
    const parsed = parseProductInput(queryTrimmed)
    const searchQuery = parsed.productName || queryTrimmed
    const searchResults = searchProductsWithScores(transformedProducts, searchQuery)

    // Transform response with category info (use join when present, else lookup by product.category_id)
    const resultsWithCategory = searchResults.map(({ product, score }) => {
      const originalProduct = products?.find((p) => p.id === product.id)
      let category =
        originalProduct &&
        Array.isArray(originalProduct.product_categories) &&
        originalProduct.product_categories.length > 0
          ? originalProduct.product_categories[0]
          : null
      if (!category && product.category_id) {
        category = categoryById.get(product.category_id) ?? null
      }

      return {
        id: product.id,
        emoji: product.emoji,
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        score,
        category: category
          ? {
              id: category.id,
              name: category.name,
              display_order: category.display_order,
            }
          : null,
        is_basic: product.is_basic,
        is_popular: product.is_popular,
      }
    })

    return NextResponse.json({
      products: resultsWithCategory,
    })
  } catch (error) {
    console.error('Search products error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
