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
        default_quantity,
        category_id,
        is_basic,
        is_popular,
        purchase_pattern_frequency,
        purchase_pattern_unit,
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

    // Transform response to flatten category data
    const transformedProducts = (products || []).map(product => ({
      id: product.id,
      emoji: product.emoji,
      name: product.name,
      description: product.description,
      default_quantity: product.default_quantity,
      category_id: product.category_id,
      category: product.product_categories ? {
        id: product.product_categories.id,
        name: product.product_categories.name,
        display_order: product.product_categories.display_order,
      } : null,
      is_basic: product.is_basic,
      is_popular: product.is_popular,
      purchase_pattern: product.purchase_pattern_frequency && product.purchase_pattern_unit ? {
        frequency: product.purchase_pattern_frequency,
        unit: product.purchase_pattern_unit,
      } : null,
      created_at: product.created_at,
      updated_at: product.updated_at,
    }))

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
      default_quantity,
      category_id,
      is_basic,
      is_popular,
      purchase_pattern_frequency,
      purchase_pattern_unit,
    } = body

    // Validation
    if (!name || !category_id) {
      return NextResponse.json(
        { error: 'Naam en categorie zijn verplicht' },
        { status: 400 }
      )
    }

    if (purchase_pattern_unit && !['days', 'weeks'].includes(purchase_pattern_unit)) {
      return NextResponse.json(
        { error: 'Purchase pattern unit moet "days" of "weeks" zijn' },
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
        default_quantity: default_quantity || '1',
        category_id: category_id,
        is_basic: is_basic || false,
        is_popular: is_popular || false,
        purchase_pattern_frequency: purchase_pattern_frequency || null,
        purchase_pattern_unit: purchase_pattern_unit || null,
      })
      .select(`
        id,
        emoji,
        name,
        description,
        default_quantity,
        category_id,
        is_basic,
        is_popular,
        purchase_pattern_frequency,
        purchase_pattern_unit,
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
    const transformedProduct = {
      id: product.id,
      emoji: product.emoji,
      name: product.name,
      description: product.description,
      default_quantity: product.default_quantity,
      category_id: product.category_id,
      category: product.product_categories ? {
        id: product.product_categories.id,
        name: product.product_categories.name,
        display_order: product.product_categories.display_order,
      } : null,
      is_basic: product.is_basic,
      is_popular: product.is_popular,
      purchase_pattern: product.purchase_pattern_frequency && product.purchase_pattern_unit ? {
        frequency: product.purchase_pattern_frequency,
        unit: product.purchase_pattern_unit,
      } : null,
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
