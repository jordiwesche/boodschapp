import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({
        members: [],
        invitations: [],
      })
    }

    // Get all members of the household
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('household_id', user.household_id)

    // Get all pending invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('household_invitations')
      .select('id, email, created_at')
      .eq('household_id', user.household_id)
      .is('accepted_at', null)

    return NextResponse.json({
      members: members || [],
      invitations: invitations || [],
    })
  } catch (error) {
    console.error('Get household members error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
