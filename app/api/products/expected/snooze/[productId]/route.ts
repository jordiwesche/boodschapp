import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SNOOZE_HOURS = 24
const SNOOZE_CORRECTION_FACTOR = 1.05
const FACTOR_MAX = 2.0

// POST /api/products/expected/snooze/[productId] - Snooze product for 24h, update frequency correction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
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

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'Huishouden niet gevonden' }, { status: 400 })
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, frequency_correction_factor')
      .eq('id', productId)
      .eq('household_id', user.household_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 })
    }

    const snoozedUntil = new Date()
    snoozedUntil.setHours(snoozedUntil.getHours() + SNOOZE_HOURS)

    const { error: upsertError } = await supabase
      .from('product_snoozes')
      .upsert(
        {
          household_id: user.household_id,
          product_id: productId,
          snoozed_until: snoozedUntil.toISOString(),
        },
        { onConflict: 'household_id,product_id' }
      )

    if (upsertError) {
      console.error('Snooze upsert error:', upsertError)
      return NextResponse.json(
        { error: 'Kon product niet snoozen' },
        { status: 500 }
      )
    }

    const currentFactor = (product.frequency_correction_factor ?? 1) as number
    const newFactor = Math.min(FACTOR_MAX, currentFactor * SNOOZE_CORRECTION_FACTOR)

    await supabase
      .from('products')
      .update({ frequency_correction_factor: newFactor })
      .eq('id', productId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Snooze error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
