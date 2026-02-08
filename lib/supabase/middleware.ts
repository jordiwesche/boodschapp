import { NextResponse, type NextRequest } from 'next/server'

/** Auth check: only validate user_id cookie (no Supabase call per request). */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userId = request.cookies.get('user_id')?.value

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  if (!userId) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
