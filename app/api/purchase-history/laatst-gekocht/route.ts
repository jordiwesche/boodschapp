import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface LaatstGekochtItem {
  id: string
  product_id: string
  product_name: string
  emoji: string
  purchased_at: string
}

// GET /api/purchase-history/laatst-gekocht - All purchase history for Laatst gekocht view (persists after clear)
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user || !user.household_id) {
      return NextResponse.json({ error: 'Kon gebruiker niet vinden' }, { status: 404 })
    }

    const { data: rows, error } = await supabase
      .from('purchase_history')
      .select(`
        id,
        product_id,
        purchased_at,
        products ( id, emoji, name )
      `)
      .eq('household_id', user.household_id)
      .order('purchased_at', { ascending: false })

    if (error) {
      console.error('Purchase history fetch error:', error)
      return NextResponse.json(
        { error: 'Kon aankoopgeschiedenis niet ophalen' },
        { status: 500 }
      )
    }

    const items: LaatstGekochtItem[] = (rows || []).map((row) => {
      const raw = row.products
      const p = (Array.isArray(raw) ? raw[0] : raw) as { id: string; emoji: string; name: string } | null
      return {
        id: row.id,
        product_id: row.product_id,
        product_name: p?.name ?? 'Onbekend product',
        emoji: p?.emoji ?? '🛒',
        purchased_at: row.purchased_at,
      }
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Laatst gekocht error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
