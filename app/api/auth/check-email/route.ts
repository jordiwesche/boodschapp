import { NextRequest, NextResponse } from 'next/server'
import { checkUserExists } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is verplicht' },
        { status: 400 }
      )
    }

    const exists = await checkUserExists(email)

    return NextResponse.json({ exists })
  } catch (error) {
    console.error('Check email error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
