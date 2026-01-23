import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { member_id } = await request.json()
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    if (!member_id) {
      return NextResponse.json(
        { error: 'Member ID is verplicht' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // For now, only allow removing your own account
    if (member_id !== userId) {
      return NextResponse.json(
        { error: 'Je kunt alleen je eigen account verwijderen' },
        { status: 403 }
      )
    }

    // Remove user from household (set household_id to NULL)
    const { error } = await supabase
      .from('users')
      .update({ household_id: null })
      .eq('id', member_id)

    if (error) {
      return NextResponse.json(
        { error: 'Kon member niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
