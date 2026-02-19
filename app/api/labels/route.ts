import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CUSTOM_LABEL_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'gray'] as const

// GET /api/labels - Get all labels for household (creates smart labels if missing)
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

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'Kon huishouden niet vinden' }, { status: 400 })
    }

    let { data: labels, error } = await supabase
      .from('labels')
      .select('id, name, color, type, slug, display_order, usage_count')
      .eq('household_id', user.household_id)
      .order('type', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
      .order('usage_count', { ascending: false })

    if (error) {
      console.error('Get labels error:', error)
      return NextResponse.json({ error: 'Kon labels niet ophalen' }, { status: 500 })
    }

    // Ensure smart labels exist (for new households)
    const hasZsm = labels?.some((l) => l.slug === 'zsm')
    const hasLater = labels?.some((l) => l.slug === 'later')

    if (!hasZsm || !hasLater) {
      const toInsert: { household_id: string; name: string; color: string; type: string; slug: string; display_order: number }[] = []
      if (!hasZsm) toInsert.push({ household_id: user.household_id, name: 'z.s.m.', color: 'amber', type: 'smart', slug: 'zsm', display_order: 0 })
      if (!hasLater) toInsert.push({ household_id: user.household_id, name: 'later', color: 'gray', type: 'smart', slug: 'later', display_order: 1 })

      const { error: insertError } = await supabase.from('labels').insert(toInsert)
      if (insertError) {
        console.error('Create smart labels error:', insertError)
      } else {
        const { data: refreshed } = await supabase
          .from('labels')
          .select('id, name, color, type, slug, display_order, usage_count')
          .eq('household_id', user.household_id)
          .order('type', { ascending: true })
          .order('display_order', { ascending: true })
          .order('usage_count', { ascending: false })
          .order('name', { ascending: true })
        labels = refreshed || labels
      }
    }

    return NextResponse.json({ labels: labels || [] })
  } catch (error) {
    console.error('Get labels error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}

// POST /api/labels - Create custom label
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
    }

    const validColor = CUSTOM_LABEL_COLORS.includes(color) ? color : 'blue'

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'Kon huishouden niet vinden' }, { status: 400 })
    }

    const { data: label, error } = await supabase
      .from('labels')
      .insert({
        household_id: user.household_id,
        name: name.trim(),
        color: validColor,
        type: 'custom',
        display_order: 999,
      })
      .select('id, name, color, type, slug, display_order, usage_count')
      .single()

    if (error) {
      console.error('Create label error:', error)
      return NextResponse.json({ error: 'Kon label niet aanmaken' }, { status: 500 })
    }

    return NextResponse.json({ label }, { status: 201 })
  } catch (error) {
    console.error('Create label error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
