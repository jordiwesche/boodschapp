import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/shopping-list - Get all shopping list items for household
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
        items: [],
      })
    }

    // Get all shopping list items for household
    const { data: items, error: itemsError } = await supabase
      .from('shopping_list_items')
      .select(`
        id,
        product_id,
        product_name,
        quantity,
        description,
        category_id,
        is_checked,
        checked_at,
        added_by,
        created_at,
        updated_at,
        product_categories (
          id,
          name,
          display_order
        ),
        products (
          id,
          emoji,
          name
        )
      `)
      .eq('household_id', user.household_id)
      .order('is_checked', { ascending: true }) // Unchecked items first
      .order('created_at', { ascending: false }) // Newest first within checked/unchecked groups

    if (itemsError) {
      console.error('Get shopping list items error:', itemsError)
      return NextResponse.json(
        { error: 'Kon boodschappenlijst niet ophalen' },
        { status: 500 }
      )
    }

    // Transform response
    const transformedItems = (items || []).map((item) => {
      const category = Array.isArray(item.product_categories) &&
        item.product_categories.length > 0
        ? item.product_categories[0]
        : null

      const product = Array.isArray(item.products) && item.products.length > 0
        ? item.products[0]
        : null

      return {
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name || (product ? product.name : null),
        emoji: product ? product.emoji : '📦',
        quantity: item.quantity,
        description: item.description,
        category_id: item.category_id,
        category: category
          ? {
              id: category.id,
              name: category.name,
              display_order: category.display_order,
            }
          : null,
        is_checked: item.is_checked,
        checked_at: item.checked_at,
        added_by: item.added_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }
    })

    return NextResponse.json({
      items: transformedItems || [],
    })
  } catch (error) {
    console.error('Get shopping list items error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// POST /api/shopping-list - Add item to shopping list
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
    const { product_id, product_name, quantity, category_id, description } = body

    // Validation
    if (!category_id) {
      return NextResponse.json(
        { error: 'Categorie is verplicht' },
        { status: 400 }
      )
    }

    if (!product_id && !product_name) {
      return NextResponse.json(
        { error: 'Product ID of productnaam is verplicht' },
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

    // If product_id provided, verify it exists and belongs to household
    if (product_id) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', product_id)
        .eq('household_id', user.household_id)
        .single()

      if (productError || !product) {
        return NextResponse.json(
          { error: 'Product niet gevonden of behoort niet tot jouw huishouden' },
          { status: 400 }
        )
      }
    }

    // Create shopping list item
    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .insert({
        household_id: user.household_id,
        product_id: product_id || null,
        product_name: product_name?.trim() || null,
        quantity: quantity || '1',
        description: description?.trim() || null,
        category_id: category_id,
        is_checked: false,
        added_by: userId,
      })
      .select(`
        id,
        product_id,
        product_name,
        quantity,
        category_id,
        is_checked,
        checked_at,
        added_by,
        created_at,
        updated_at,
        product_categories (
          id,
          name,
          display_order
        ),
        products (
          id,
          emoji,
          name
        )
      `)
      .single()

    if (itemError) {
      console.error('Create shopping list item error:', itemError)
      return NextResponse.json(
        { error: 'Kon item niet toevoegen aan boodschappenlijst' },
        { status: 500 }
      )
    }

    // Transform response
    const categoryData = Array.isArray(item.product_categories) &&
      item.product_categories.length > 0
      ? item.product_categories[0]
      : null

    const product = Array.isArray(item.products) && item.products.length > 0
      ? item.products[0]
      : null

    const transformedItem = {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name || (product ? product.name : null),
      emoji: product ? product.emoji : '📦',
      quantity: item.quantity,
      description: item.description,
      category_id: item.category_id,
      category: categoryData
        ? {
            id: categoryData.id,
            name: categoryData.name,
            display_order: categoryData.display_order,
          }
        : null,
      is_checked: item.is_checked,
      checked_at: item.checked_at,
      added_by: item.added_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }

    return NextResponse.json(
      { item: transformedItem },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create shopping list item error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
