import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/categories/[id] - Update category
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
    const { name, display_order } = body

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
    const { data: existingCategory, error: existingError } = await supabase
      .from('product_categories')
      .select('id')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (existingError || !existingCategory) {
      return NextResponse.json(
        { error: 'Categorie niet gevonden of behoort niet tot jouw huishouden' },
        { status: 404 }
      )
    }

    // Build update object (only include provided fields)
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (display_order !== undefined) updateData.display_order = display_order

    // Update category
    const { data: category, error: categoryError } = await supabase
      .from('product_categories')
      .update(updateData)
      .eq('id', id)
      .eq('household_id', user.household_id)
      .select('id, name, display_order, created_at, updated_at')
      .single()

    if (categoryError) {
      // Check if it's a unique constraint violation
      if (categoryError.code === '23505') {
        return NextResponse.json(
          { error: 'Categorie met deze naam bestaat al' },
          { status: 400 }
        )
      }
      console.error('Update category error:', categoryError)
      return NextResponse.json(
        { error: 'Kon categorie niet updaten' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      category: category,
    })
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Delete category
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

    // Verify category belongs to household
    const { data: existingCategory, error: existingError } = await supabase
      .from('product_categories')
      .select('id')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (existingError || !existingCategory) {
      return NextResponse.json(
        { error: 'Categorie niet gevonden of behoort niet tot jouw huishouden' },
        { status: 404 }
      )
    }

    // Check if category has products (foreign key constraint will prevent deletion, but we can give better error)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (productsError) {
      console.error('Check products error:', productsError)
    }

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: 'Kan categorie niet verwijderen: er zijn nog producten in deze categorie' },
        { status: 400 }
      )
    }

    // Delete category
    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)
      .eq('household_id', user.household_id)

    if (deleteError) {
      console.error('Delete category error:', deleteError)
      return NextResponse.json(
        { error: 'Kon categorie niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
