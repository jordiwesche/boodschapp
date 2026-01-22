import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { emails, household_id } = await request.json()
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Emailadressen zijn verplicht' },
        { status: 400 }
      )
    }

    if (!household_id) {
      return NextResponse.json(
        { error: 'Huishouden ID is verplicht' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user belongs to household
    const { data: user } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (!user || user.household_id !== household_id) {
      return NextResponse.json(
        { error: 'Geen toegang tot dit huishouden' },
        { status: 403 }
      )
    }

    // Create invitations
    const invitations = emails
      .filter((email: string) => email && email.trim())
      .map((email: string) => ({
        household_id,
        email: email.toLowerCase().trim(),
        invited_by: userId,
      }))

    if (invitations.length === 0) {
      return NextResponse.json(
        { error: 'Geen geldige emailadressen' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('household_invitations').insert(invitations)

    if (error) {
      return NextResponse.json(
        { error: 'Kon uitnodigingen niet aanmaken' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
