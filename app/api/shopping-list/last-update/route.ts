import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/shopping-list/last-update - Get last update info for shopping list
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
        lastUpdate: null,
      })
    }

    // Get all items and find the one with the most recent activity (max of updated_at or created_at)
    const { data: items, error: itemsError } = await supabase
      .from('shopping_list_items')
      .select('updated_at, created_at, added_by')
      .eq('household_id', user.household_id)

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json({
        lastUpdate: null,
      })
    }

    // Find item with most recent activity (max of updated_at or created_at)
    let lastItem = items[0]
    let lastUpdateTime = new Date(Math.max(
      new Date(lastItem.updated_at).getTime(),
      new Date(lastItem.created_at).getTime()
    ))

    for (const item of items) {
      const itemUpdateTime = new Date(Math.max(
        new Date(item.updated_at).getTime(),
        new Date(item.created_at).getTime()
      ))
      if (itemUpdateTime > lastUpdateTime) {
        lastUpdateTime = itemUpdateTime
        lastItem = item
      }
    }

    // Get user info who made the last update
    const { data: lastUser, error: userInfoError } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', lastItem.added_by)
      .single()

    if (userInfoError || !lastUser) {
      return NextResponse.json({
        lastUpdate: null,
      })
    }

    return NextResponse.json({
      lastUpdate: {
        userName: lastUser.first_name,
        updatedAt: lastUpdateTime.toISOString(),
      },
    })
  } catch (error) {
    console.error('Get last update error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
