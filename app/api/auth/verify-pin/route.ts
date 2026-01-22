import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, pin } = await request.json()

    if (!email || !pin) {
      return NextResponse.json(
        { error: 'Email en PIN zijn verplicht' },
        { status: 400 }
      )
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN moet 6 cijfers zijn' },
        { status: 400 }
      )
    }

    // Verify Supabase Auth session
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Niet geauthenticeerd. Log opnieuw in.' },
        { status: 401 }
      )
    }

    // Verify email matches
    if (authUser.email?.toLowerCase() !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Email komt niet overeen' },
        { status: 401 }
      )
    }

    // Get user from our users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, pin_hash, first_name, household_id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Gebruiker niet gevonden' },
        { status: 404 }
      )
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, user.pin_hash)
    if (!isValidPin) {
      return NextResponse.json(
        { error: 'Ongeldige PIN' },
        { status: 401 }
      )
    }

    // Link Supabase Auth user to our user record if needed
    // Store user_id in session for easy access
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        household_id: user.household_id,
      },
    })

    // Set session cookie for our app
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Verify PIN error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
