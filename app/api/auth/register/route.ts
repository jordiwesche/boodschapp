import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPin, findPendingInvitation } from '@/lib/auth'
import { copyHouseholdDataFromSeed } from '@/lib/seed-household'

export async function POST(request: NextRequest) {
  try {
    const { email, pin, first_name, household_name, invited_emails } = await request.json()

    if (!email || !pin || !first_name) {
      return NextResponse.json(
        { error: 'Email, PIN en voornaam zijn verplicht' },
        { status: 400 }
      )
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN moet 6 cijfers zijn' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Gebruiker bestaat al' },
        { status: 400 }
      )
    }

    // Check for pending invitation
    const invitation = await findPendingInvitation(email)

    let householdId: string

    if (invitation) {
      // User has pending invitation, use existing household
      householdId = invitation.household_id
    } else {
      // No invitation, create new household
      if (!household_name) {
        return NextResponse.json(
          { error: 'Huishouden naam is verplicht' },
          { status: 400 }
        )
      }

      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({ name: household_name })
        .select('id')
        .single()

      if (householdError || !household) {
        return NextResponse.json(
          { error: 'Kon huishouden niet aanmaken' },
          { status: 500 }
        )
      }

      householdId = household.id

      // Kopieer categorieën en producten van SEED_HOUSEHOLD_ID indien geconfigureerd
      try {
        await copyHouseholdDataFromSeed(householdId)
      } catch (err) {
        console.error('Seed household data error:', err)
        // Ga door met registratie; het huishouden is al aangemaakt
      }
    }

    // Hash PIN
    const pinHash = await hashPin(pin)

    // Note: We'll create the Supabase Auth user when they first log in via magic link
    // For now, just create the user in our users table

    // Create user in our users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        pin_hash: pinHash,
        first_name: first_name.trim(),
        household_id: householdId,
      })
      .select('id, email, first_name, household_id')
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Kon gebruiker niet aanmaken' },
        { status: 500 }
      )
    }

    // If user had invitation, mark it as accepted
    if (invitation) {
      await supabase
        .from('household_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
    }

    // If user provided invited emails, create invitations
    if (invited_emails && Array.isArray(invited_emails) && invited_emails.length > 0) {
      const invitations = invited_emails
        .filter((email: string) => email && email.trim())
        .map((email: string) => ({
          household_id: householdId,
          email: email.toLowerCase().trim(),
          invited_by: user.id,
        }))

      if (invitations.length > 0) {
        await supabase.from('household_invitations').insert(invitations)
      }
    }

    // Create session
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        household_id: user.household_id,
      },
    })

    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
