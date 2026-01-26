import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/shopping-list/[id] - Update shopping list item
export async function PATCH(
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
    const { quantity, is_checked, description } = body

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

    // Verify item belongs to household
    const { data: existingItem, error: existingError } = await supabase
      .from('shopping_list_items')
      .select('id, household_id')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (existingError || !existingItem) {
      return NextResponse.json(
        { error: 'Item niet gevonden' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (quantity !== undefined) {
      updateData.quantity = quantity
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }
    if (is_checked !== undefined) {
      updateData.is_checked = is_checked
      if (is_checked) {
        updateData.checked_at = new Date().toISOString()
      } else {
        updateData.checked_at = null
      }
    }

    // Update item
    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .update(updateData)
      .eq('id', id)
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
      .single()

    if (itemError) {
      console.error('Update shopping list item error:', itemError)
      return NextResponse.json(
        { error: 'Kon item niet bijwerken' },
        { status: 500 }
      )
    }

    // Transform response
    // If product join didn't work, fetch product separately
    let product = null
    const hasJoinedProduct = item.products && 
      Array.isArray(item.products) && 
      item.products.length > 0 &&
      item.products[0]?.id
    
    if (hasJoinedProduct) {
      product = item.products[0]
    } else if (item.product_id) {
      const { data: productData } = await supabase
        .from('products')
        .select('id, emoji, name')
        .eq('id', item.product_id)
        .single()
      
      if (productData) {
        product = productData
      }
    }

    // Get category from join or fetch separately
    let category = null
    
    const hasJoinedCategory = item.product_categories && 
      Array.isArray(item.product_categories) && 
      item.product_categories.length > 0 &&
      item.product_categories[0]?.id
    
    if (hasJoinedCategory) {
      category = item.product_categories[0]
    } else if (item.category_id) {
      // Category join didn't work, fetch separately
      const { data: categoryData } = await supabase
        .from('product_categories')
        .select('id, name, display_order')
        .eq('id', item.category_id)
        .single()
      
      if (categoryData) {
        category = categoryData
      }
    }

    const transformedItem = {
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

    return NextResponse.json({
      item: transformedItem,
    })
  } catch (error) {
    console.error('Update shopping list item error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// DELETE /api/shopping-list/[id] - Delete shopping list item
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

    // Verify item belongs to household
    const { data: existingItem, error: existingError } = await supabase
      .from('shopping_list_items')
      .select('id, household_id')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (existingError || !existingItem) {
      return NextResponse.json(
        { error: 'Item niet gevonden' },
        { status: 404 }
      )
    }

    // Delete item
    const { error: deleteError } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete shopping list item error:', deleteError)
      return NextResponse.json(
        { error: 'Kon item niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete shopping list item error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
