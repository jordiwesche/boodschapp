import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const email = requestUrl.searchParams.get('email')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      // Auth successful, redirect to PIN verification
      const redirectUrl = new URL('/login/pin', requestUrl.origin)
      if (email) {
        redirectUrl.searchParams.set('email', email)
      }
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If there's an error or no token, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
