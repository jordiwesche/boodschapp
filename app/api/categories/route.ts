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
          'Huishoudelijke Artikelen',
          'Overig'
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

// POST /api/categories - Create new category
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
    const { name, display_order } = body

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Naam is verplicht' },
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

    // Get max display_order to set new category at the end
    const { data: existingCategories } = await supabase
      .from('product_categories')
      .select('display_order')
      .eq('household_id', user.household_id)
      .order('display_order', { ascending: false })
      .limit(1)

    // Always set new categories at the end (maxOrder + 1), unless explicitly provided
    const maxOrder = existingCategories && existingCategories.length > 0
      ? existingCategories[0].display_order + 1
      : 0
    
    // Only use provided display_order if explicitly set, otherwise use maxOrder
    const finalDisplayOrder = display_order !== undefined ? display_order : maxOrder

    // Create category
    const { data: category, error: categoryError } = await supabase
      .from('product_categories')
      .insert({
        household_id: user.household_id,
        name: name.trim(),
        display_order: finalDisplayOrder,
      })
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
      console.error('Create category error:', categoryError)
      return NextResponse.json(
        { error: 'Kon categorie niet aanmaken' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      category: category,
    }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
