import { NextRequest, NextResponse } from 'next/server'
import { findPendingInvitation } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is verplicht' },
        { status: 400 }
      )
    }

    const invitation = await findPendingInvitation(email)

    return NextResponse.json({ hasInvitation: !!invitation })
  } catch (error) {
    console.error('Check invitation error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
