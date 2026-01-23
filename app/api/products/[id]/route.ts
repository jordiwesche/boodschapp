import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/products/[id] - Get single product
export async function GET(
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

    // Get product
    const { data: product, error: productError } = await supabase
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
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product niet gevonden' },
        { status: 404 }
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
    })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
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

    // Verify product belongs to household
    const { data: existingProduct, error: existingError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (existingError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product niet gevonden of behoort niet tot jouw huishouden' },
        { status: 404 }
      )
    }

    // Verify category if provided
    if (category_id) {
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
    }

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (emoji !== undefined) updateData.emoji = emoji
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (default_quantity !== undefined) updateData.default_quantity = default_quantity
    if (category_id !== undefined) updateData.category_id = category_id
    if (is_basic !== undefined) updateData.is_basic = is_basic
    if (is_popular !== undefined) updateData.is_popular = is_popular
    if (purchase_pattern_frequency !== undefined) {
      updateData.purchase_pattern_frequency = purchase_pattern_frequency || null
    }
    if (purchase_pattern_unit !== undefined) {
      updateData.purchase_pattern_unit = purchase_pattern_unit || null
    }

    // Update product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('household_id', user.household_id)
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
      console.error('Update product error:', productError)
      return NextResponse.json(
        { error: 'Kon product niet updaten' },
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
    })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
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

    // Verify product belongs to household
    const { data: existingProduct, error: existingError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (existingError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product niet gevonden of behoort niet tot jouw huishouden' },
        { status: 404 }
      )
    }

    // Delete product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('household_id', user.household_id)

    if (deleteError) {
      console.error('Delete product error:', deleteError)
      return NextResponse.json(
        { error: 'Kon product niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
