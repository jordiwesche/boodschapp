import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/products - Get all products for household
export async function GET(request: NextRequest) {
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
      return NextResponse.json({
        products: [],
      })
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('category_id')
    const isBasic = searchParams.get('is_basic')
    const isPopular = searchParams.get('is_popular')

    // Build query
    let query = supabase
      .from('products')
      .select(`
        id,
        emoji,
        name,
        description,
        category_id,
        is_basic,
        is_popular,
        frequency_correction_factor,
        created_at,
        updated_at,
        product_categories (
          id,
          name,
          display_order
        )
      `)
      .eq('household_id', user.household_id)

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (isBasic !== null) {
      query = query.eq('is_basic', isBasic === 'true')
    }
    if (isPopular !== null) {
      query = query.eq('is_popular', isPopular === 'true')
    }

    // Order by category display_order, then product name
    const { data: products, error: productsError } = await query
      .order('name', { ascending: true })

    if (productsError) {
      console.error('Get products error:', productsError)
      return NextResponse.json(
        { error: 'Kon producten niet ophalen' },
        { status: 500 }
      )
    }

    const includePurchaseCount = searchParams.get('include') === 'purchase_count'
    let purchaseCountByProductId: Record<string, number> = {}
    let lastPurchasedAtByProductId: Record<string, string> = {}

    if (includePurchaseCount && products && products.length > 0) {
      const productIds = products.map((p: { id: string }) => p.id)
      const { data: rows, error: histError } = await supabase
        .from('purchase_history')
        .select('product_id, purchased_at')
        .eq('household_id', user.household_id)
        .in('product_id', productIds)

      if (!histError && rows) {
        for (const row of rows) {
          const id = row.product_id
          purchaseCountByProductId[id] = (purchaseCountByProductId[id] ?? 0) + 1
          const at = row.purchased_at
          if (at) {
            const existing = lastPurchasedAtByProductId[id]
            if (!existing || at > existing) {
              lastPurchasedAtByProductId[id] = at
            }
          }
        }
      }
    }

    // Transform response to flatten category data
    const transformedProducts = (products || []).map((product: { id: string; product_categories?: unknown; [key: string]: unknown }) => {
      const rawCat = product.product_categories
      const category = Array.isArray(rawCat) && rawCat.length > 0
        ? rawCat[0]
        : rawCat && typeof rawCat === 'object' && !Array.isArray(rawCat)
          ? rawCat
          : null

      const out: Record<string, unknown> = {
        id: product.id,
        emoji: product.emoji,
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        category: category ? {
          id: (category as { id: string }).id,
          name: (category as { name: string }).name,
          display_order: (category as { display_order: number }).display_order,
        } : null,
        is_basic: product.is_basic,
        is_popular: product.is_popular,
        frequency_correction_factor: product.frequency_correction_factor ?? 1,
        created_at: product.created_at,
        updated_at: product.updated_at,
      }
      if (includePurchaseCount) {
        out.purchase_count = purchaseCountByProductId[product.id] ?? 0
        out.last_purchased_at = lastPurchasedAtByProductId[product.id] ?? null
      }
      return out
    })

    return NextResponse.json({
      products: transformedProducts || [],
    })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product
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
    const {
      emoji,
      name,
      description,
      category_id,
      is_basic,
      is_popular,
    } = body

    // Validation
    if (!name || !category_id) {
      return NextResponse.json(
        { error: 'Naam en categorie zijn verplicht' },
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

    // Verify category belongs to household
    const { data: category, error: categoryError } = await supabase
      .from('product_categories')
      .select('id')
      .eq('id', category_id)
      .eq('household_id', user.household_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Categorie niet gevonden of behoort niet tot jouw huishouden' },
        { status: 400 }
      )
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        household_id: user.household_id,
        emoji: emoji || '📦',
        name: name.trim(),
        description: description?.trim() || null,
        category_id: category_id,
        is_basic: is_basic || false,
        is_popular: is_popular || false,
      })
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
      .single()

    if (productError) {
      console.error('Create product error:', productError)
      return NextResponse.json(
        { error: 'Kon product niet aanmaken' },
        { status: 500 }
      )
    }

    // Transform response
    const productCategory = Array.isArray(product.product_categories) && product.product_categories.length > 0
      ? product.product_categories[0]
      : null

    const transformedProduct = {
      id: product.id,
      emoji: product.emoji,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      category: productCategory ? {
        id: productCategory.id,
        name: productCategory.name,
        display_order: productCategory.display_order,
      } : null,
      is_basic: product.is_basic,
      is_popular: product.is_popular,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }

    return NextResponse.json({
      product: transformedProduct,
    }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
