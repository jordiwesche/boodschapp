import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/shopping-list/cancel-purchase/[id] - Remove purchase record when user unchecks within 30s (accidental check)
export async function POST(
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

    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .select('id, is_checked, checked_at')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item niet gevonden' },
        { status: 404 }
      )
    }

    if (!item.is_checked) {
      return NextResponse.json({ success: true, message: 'Item niet afgevinkt, niets te annuleren' })
    }

    const checkedAt = item.checked_at ? new Date(item.checked_at).getTime() : 0
    const now = Date.now()
    const diffSeconds = checkedAt ? (now - checkedAt) / 1000 : 999

    if (diffSeconds > 30) {
      return NextResponse.json({
        success: true,
        message: 'Meer dan 30 seconden geleden afgevinkt, purchase wordt niet geannuleerd',
      })
    }

    const { error: deleteError } = await supabase
      .from('purchase_history')
      .delete()
      .eq('shopping_list_item_id', id)

    if (deleteError) {
      console.error('Cancel purchase delete error:', deleteError)
      return NextResponse.json(
        { error: 'Kon purchase niet annuleren' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel purchase error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
