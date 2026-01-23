import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { invitation_id } = await request.json()
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    if (!invitation_id) {
      return NextResponse.json(
        { error: 'Invitation ID is verplicht' },
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

    // Verify invitation belongs to user's household
    const { data: invitation, error: invitationError } = await supabase
      .from('household_invitations')
      .select('household_id')
      .eq('id', invitation_id)
      .single()

    if (invitationError || !invitation || invitation.household_id !== user.household_id) {
      return NextResponse.json(
        { error: 'Uitnodiging niet gevonden' },
        { status: 404 }
      )
    }

    // Delete invitation
    const { error } = await supabase
      .from('household_invitations')
      .delete()
      .eq('id', invitation_id)

    if (error) {
      return NextResponse.json(
        { error: 'Kon uitnodiging niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove invitation error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
