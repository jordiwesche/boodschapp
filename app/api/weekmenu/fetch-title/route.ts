import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url query required' }, { status: 400 })
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Ongeldige URL' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Alleen http/https' }, { status: 400 })
  }
  try {
    const res = await fetch(parsed.href, {
      method: 'GET',
      headers: { 'User-Agent': 'Boodschapp/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return NextResponse.json({ title: null })
    }
    const html = await res.text()
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = match ? match[1].replace(/\s+/g, ' ').trim().slice(0, 200) : null
    return NextResponse.json({ title: title || null })
  } catch {
    return NextResponse.json({ title: null })
  }
}
