import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user's household_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user || !user.household_id) {
      return NextResponse.json({
        id: null,
        name: '',
      })
    }

    // Get household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('id, name')
      .eq('id', user.household_id)
      .single()

    if (householdError || !household) {
      return NextResponse.json({
        id: null,
        name: '',
      })
    }

    return NextResponse.json({
      id: household.id,
      name: household.name,
    })
  } catch (error) {
    console.error('Get current household error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
