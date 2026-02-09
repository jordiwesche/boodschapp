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
    // If products join didn't work, fetch products separately for items with product_id
    const itemsWithProducts = await Promise.all(
      (items || []).map(async (item) => {
        let product = null
        
        // Check if we have a valid product from join
        const hasJoinedProduct = item.products && 
          Array.isArray(item.products) && 
          item.products.length > 0 &&
          item.products[0]?.id
        
        if (hasJoinedProduct) {
          product = item.products[0]
          // #region agent log
          console.log(JSON.stringify({location:'shopping-list/route.ts:88',message:'GET using joined product',data:{itemId:item.id,productName:product.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'}));
          // #endregion
        } else if (item.product_id) {
          // Product join didn't work, fetch separately
          // #region agent log
          console.log(JSON.stringify({location:'shopping-list/route.ts:76',message:'GET fetching product separately',data:{itemId:item.id,productId:item.product_id,hasProducts:!!item.products,productsType:typeof item.products},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'}));
          // #endregion
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('id, emoji, name')
            .eq('id', item.product_id)
            .single()
          
          // #region agent log
          console.log(JSON.stringify({location:'shopping-list/route.ts:83',message:'GET product fetch result',data:{itemId:item.id,hasProductData:!!productData,productError:productError?.message,productName:productData?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'}));
          // #endregion
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
          const { data: categoryData, error: categoryError } = await supabase
            .from('product_categories')
            .select('id, name, display_order')
            .eq('id', item.category_id)
            .single()
          
          if (categoryData) {
            category = categoryData
          }
        }

        return {
          ...item,
          product,
          category,
        }
      })
    )

    const transformedItems = itemsWithProducts.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name || (item.product ? item.product.name : null),
      emoji: item.product ? item.product.emoji : '📦',
      quantity: item.quantity,
      description: item.description,
      category_id: item.category_id,
      category: item.category
        ? {
            id: item.category.id,
            name: item.category.name,
            display_order: item.category.display_order,
          }
        : null,
      is_checked: item.is_checked,
      checked_at: item.checked_at,
      added_by: item.added_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

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
    const { product_id, product_name, quantity, category_id, description, from_verwacht, expected_days } = body

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

    // Create shopping list item (optionally track Verwacht add for algorithm analysis)
    const insertPayload: Record<string, unknown> = {
      household_id: user.household_id,
      product_id: product_id || null,
      product_name: product_name?.trim() || null,
      quantity: quantity || '1',
      description: description?.trim() || null,
      category_id: category_id,
      is_checked: false,
      added_by: userId,
    }
    if (from_verwacht === true && typeof expected_days === 'number' && expected_days >= 0) {
      insertPayload.added_from_verwacht_at = new Date().toISOString()
      insertPayload.verwacht_expected_days_at_add = Math.min(32767, Math.floor(expected_days))
    }
    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .insert(insertPayload)
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
      console.error('Create shopping list item error:', itemError)
      return NextResponse.json(
        { error: 'Kon item niet toevoegen aan boodschappenlijst' },
        { status: 500 }
      )
    }

    // Transform response
    // If product join didn't work, fetch product separately
    // #region agent log
    console.log(JSON.stringify({location:'shopping-list/route.ts:262',message:'POST item created',data:{itemId:item.id,productId:item.product_id,hasProducts:!!item.products,productsType:typeof item.products,productsLength:Array.isArray(item.products)?item.products.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'}));
    // #endregion
    let product = null
    
    // Check if we have a valid product from join
    const hasJoinedProduct = item.products && 
      Array.isArray(item.products) && 
      item.products.length > 0 &&
      item.products[0]?.id
    
    if (hasJoinedProduct) {
      product = item.products[0]
      // #region agent log
      console.log(JSON.stringify({location:'shopping-list/route.ts:279',message:'POST using joined product',data:{productName:product.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'}));
      // #endregion
    } else if (item.product_id) {
      // Product join didn't work, fetch separately
      // #region agent log
      console.log(JSON.stringify({location:'shopping-list/route.ts:265',message:'POST fetching product separately',data:{productId:item.product_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'}));
      // #endregion
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, emoji, name')
        .eq('id', item.product_id)
        .single()
      
      // #region agent log
      console.log(JSON.stringify({location:'shopping-list/route.ts:272',message:'POST product fetch result',data:{hasProductData:!!productData,productError:productError?.message,productName:productData?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'}));
      // #endregion
      if (productData) {
        product = productData
      }
    }

    // Get category from join or fetch separately
    let categoryData = null
    
    const hasJoinedCategory = item.product_categories && 
      Array.isArray(item.product_categories) && 
      item.product_categories.length > 0 &&
      item.product_categories[0]?.id
    
    if (hasJoinedCategory) {
      categoryData = item.product_categories[0]
    } else if (item.category_id) {
      // Category join didn't work, fetch separately
      const { data: category, error: categoryError } = await supabase
        .from('product_categories')
        .select('id, name, display_order')
        .eq('id', item.category_id)
        .single()
      
      if (category) {
        categoryData = category
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
