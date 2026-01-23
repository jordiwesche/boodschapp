import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
        categories: [],
      })
    }

    // Get categories for household, sorted by display_order
    const { data: categories, error: categoriesError } = await supabase
      .from('product_categories')
      .select('id, name, display_order, created_at, updated_at')
      .eq('household_id', user.household_id)
      .order('display_order', { ascending: true })

    if (categoriesError) {
      console.error('Get categories error:', categoriesError)
      return NextResponse.json(
        { error: 'Kon categorieën niet ophalen' },
        { status: 500 }
      )
    }

    // If no categories exist, create default categories
    if (!categories || categories.length === 0) {
      const { error: createError } = await supabase.rpc('create_default_categories', {
        household_uuid: user.household_id
      })

      if (createError) {
        console.error('Create default categories error:', createError)
        // Fallback: create categories manually
        const defaultCategories = [
          'Groente & Fruit',
          'Vlees & Vis',
          'Zuivel',
          'Brood & Bakkerij',
          'Dranken',
          'Droge Kruidenierswaren',
          'Diepvries',
          'Houdbare Producten',
          'Persoonlijke Verzorging',
          'Huishoudelijke Artikelen'
        ]

        const categoriesToInsert = defaultCategories.map((name, index) => ({
          household_id: user.household_id,
          name,
          display_order: index
        }))

        const { data: createdCategories, error: insertError } = await supabase
          .from('product_categories')
          .insert(categoriesToInsert)
          .select('id, name, display_order, created_at, updated_at')

        if (insertError) {
          return NextResponse.json(
            { error: 'Kon standaard categorieën niet aanmaken' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          categories: createdCategories || [],
        })
      }

      // Fetch categories again after creation
      const { data: newCategories } = await supabase
        .from('product_categories')
        .select('id, name, display_order, created_at, updated_at')
        .eq('household_id', user.household_id)
        .order('display_order', { ascending: true })

      return NextResponse.json({
        categories: newCategories || [],
      })
    }

    return NextResponse.json({
      categories: categories || [],
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
