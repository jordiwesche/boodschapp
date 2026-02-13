import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/purchase-history/[recordId] - Delete a single purchase history record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const { recordId } = await params
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user || !user.household_id) {
      return NextResponse.json(
        { error: 'Kon gebruiker niet vinden' },
        { status: 404 }
      )
    }

    const { data: record, error: fetchError } = await supabase
      .from('purchase_history')
      .select('id, household_id')
      .eq('id', recordId)
      .single()

    if (fetchError || !record) {
      return NextResponse.json(
        { error: 'Record niet gevonden' },
        { status: 404 }
      )
    }

    if (record.household_id !== user.household_id) {
      return NextResponse.json(
        { error: 'Geen toegang tot dit record' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('purchase_history')
      .delete()
      .eq('id', recordId)

    if (deleteError) {
      console.error('Delete purchase record error:', deleteError)
      return NextResponse.json(
        { error: 'Kon record niet verwijderen' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete purchase record error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
