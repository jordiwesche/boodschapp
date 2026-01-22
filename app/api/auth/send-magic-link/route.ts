import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is verplicht' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Check if user exists in our users table
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'Gebruiker niet gevonden. Ga naar onboarding om een account aan te maken.' },
        { status: 404 }
      )
    }

    // Send magic link via Supabase Auth
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://boodschapp.vercel.app' 
        : 'http://localhost:3000')
    
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${redirectUrl}/auth/callback?email=${encodeURIComponent(email)}`,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: 'Kon magic link niet versturen. Probeer het opnieuw.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Check je email voor de verificatielink' 
    })
  } catch (error) {
    console.error('Send magic link error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
