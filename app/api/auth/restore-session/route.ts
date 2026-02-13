import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Restore session from Cache API backup (Safari PWA).
 * Validates user exists and re-sets the cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()

    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json({ error: 'user_id verplicht' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Ongeldige sessie' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Restore session error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
