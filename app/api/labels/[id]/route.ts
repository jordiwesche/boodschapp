import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CUSTOM_LABEL_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'gray'] as const

// PUT /api/labels/[id] - Update custom label
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color } = body

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'Kon huishouden niet vinden' }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('labels')
      .select('id, type')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Label niet gevonden' }, { status: 404 })
    }

    if (existing.type === 'smart') {
      return NextResponse.json({ error: 'Smart labels kunnen niet worden bewerkt' }, { status: 400 })
    }

    const updateData: { name?: string; color?: string } = {}
    if (name !== undefined && typeof name === 'string' && name.trim()) updateData.name = name.trim()
    if (color !== undefined && CUSTOM_LABEL_COLORS.includes(color)) updateData.color = color

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Geen wijzigingen' }, { status: 400 })
    }

    const { data: label, error } = await supabase
      .from('labels')
      .update(updateData)
      .eq('id', id)
      .select('id, name, color, type, slug, display_order, usage_count')
      .single()

    if (error) {
      console.error('Update label error:', error)
      return NextResponse.json({ error: 'Kon label niet bijwerken' }, { status: 500 })
    }

    return NextResponse.json({ label })
  } catch (error) {
    console.error('Update label error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}

// DELETE /api/labels/[id] - Delete custom label
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: existing, error: fetchError } = await supabase
      .from('labels')
      .select('id, type')
      .eq('id', id)
      .eq('household_id', user.household_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Label niet gevonden' }, { status: 404 })
    }

    if (existing.type === 'smart') {
      return NextResponse.json({ error: 'Smart labels kunnen niet worden verwijderd' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('labels')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete label error:', deleteError)
      return NextResponse.json({ error: 'Kon label niet verwijderen' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete label error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
