import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { first_name } = await request.json()
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    if (!first_name || first_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Voornaam is verplicht' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update user name
    const { data, error } = await supabase
      .from('users')
      .update({ first_name: first_name.trim() })
      .eq('id', userId)
      .select('id, first_name')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Kon naam niet updaten' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        first_name: data.first_name,
      },
    })
  } catch (error) {
    console.error('Update name error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
