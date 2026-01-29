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

    // Fetch categories for household so we can attach category when join is empty (e.g. FK set but relation not populated)
    const { data: categories } = await supabase
      .from('product_categories')
      .select('id, name, display_order')
      .eq('household_id', user.household_id)
    const categoryById = new Map((categories || []).map((c) => [c.id, c]))

    // Transform to Product type
    const transformedProducts: Product[] = (products || []).map((product) => {
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
      }
    })

    // Perform fuzzy search
    // Extract just the product name part (before any quantity/annotation/description)
    // This allows searching "Bananen 12x" or "Bananen voor ontbijt" and still finding "Bananen"
    const queryTrimmed = query.trim()
    
    // Use annotation parser to extract product name (handles descriptions, quantities, etc.)
    const parsed = parseProductInput(queryTrimmed)
    const productName = parsed.productName || queryTrimmed
    
    // If parser found a product name, use that for search
    // Otherwise, try to extract product name by removing common patterns
    let searchQuery = productName
    if (searchQuery === queryTrimmed) {
      // Parser didn't extract a product name, try manual extraction
      const quantityPattern = /\s+\d+[xX]?\s*$/
      if (quantityPattern.test(searchQuery)) {
        // Remove quantity suffix for search
        searchQuery = searchQuery.replace(quantityPattern, '').trim()
      }
      // Also try removing parentheses content
      searchQuery = searchQuery.replace(/\s*\([^)]*\)\s*$/, '').trim()
    }
    
    // Use the extracted product name for search (ignores descriptions/annotations)
    const searchResults = searchProductsWithScores(transformedProducts, searchQuery || queryTrimmed)

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
