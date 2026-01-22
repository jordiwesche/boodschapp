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

    const supabase = await createClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, pin_hash, first_name, household_id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Ongeldige email of PIN' },
        { status: 401 }
      )
    }

    const isValidPin = await verifyPin(pin, user.pin_hash)
    if (!isValidPin) {
      return NextResponse.json(
        { error: 'Ongeldige email of PIN' },
        { status: 401 }
      )
    }

    // Create session (we'll use a simple cookie-based session)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        household_id: user.household_id,
      },
    })

    // Set session cookie
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
