import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/shopping-list/clear-checked - Delete all checked shopping list items
export async function DELETE(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Kon gebruiker niet vinden' },
        { status: 404 }
      )
    }

    // Delete all checked items for this household
    const { error: deleteError } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('household_id', user.household_id)
      .eq('is_checked', true)

    if (deleteError) {
      console.error('Delete checked items error:', deleteError)
      return NextResponse.json(
        { error: 'Kon items niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Clear checked items error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
