import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Huishouden naam is verplicht' },
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
        { error: 'Geen huishouden gevonden' },
        { status: 404 }
      )
    }

    // Update household name
    const { data, error } = await supabase
      .from('households')
      .update({ name: name.trim() })
      .eq('id', user.household_id)
      .select('id, name')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Kon huishouden naam niet updaten' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      household: {
        id: data.id,
        name: data.name,
      },
    })
  } catch (error) {
    console.error('Update household name error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
