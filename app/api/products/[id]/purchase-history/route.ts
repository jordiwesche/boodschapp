import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PurchaseHistory } from '@/types/database'

// GET /api/products/[id]/purchase-history - Get purchase history for a product
export async function GET(
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
        { error: 'Kon gebruiker niet vinden' },
        { status: 404 }
      )
    }

    // Get purchase history for this product
    const { data: history, error: historyError } = await supabase
      .from('purchase_history')
      .select('*')
      .eq('household_id', user.household_id)
      .eq('product_id', id)
      .order('purchased_at', { ascending: false })

    if (historyError) {
      console.error('Get purchase history error:', historyError)
      return NextResponse.json(
        { error: 'Kon koophistorie niet ophalen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      history: (history || []) as PurchaseHistory[],
    })
  } catch (error) {
    console.error('Get purchase history error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/purchase-history - Reset purchase history for a product
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
        { error: 'Kon gebruiker niet vinden' },
        { status: 404 }
      )
    }

    // Delete all purchase history for this product
    const { error: deleteError } = await supabase
      .from('purchase_history')
      .delete()
      .eq('household_id', user.household_id)
      .eq('product_id', id)

    if (deleteError) {
      console.error('Delete purchase history error:', deleteError)
      return NextResponse.json(
        { error: 'Kon koophistorie niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete purchase history error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
