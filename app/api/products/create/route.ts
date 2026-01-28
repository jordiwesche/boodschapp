import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictCategoryAndEmoji } from '@/lib/predict-category-emoji'

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
      
      // Find category by name in household
      const { data: category, error: categoryError } = await supabase
        .from('product_categories')
        .select('id')
        .eq('household_id', user.household_id)
        .eq('name', prediction.categoryName)
        .single()

      if (category && !categoryError) {
        finalCategoryId = category.id
      } else {
        // Fallback: find "Overig" category
        const { data: overigCategory } = await supabase
          .from('product_categories')
          .select('id')
          .eq('household_id', user.household_id)
          .eq('name', 'Overig')
          .single()

        if (overigCategory) {
          finalCategoryId = overigCategory.id
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
