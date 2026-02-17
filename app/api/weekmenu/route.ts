import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Maandag van de huidige week (ISO) */
function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.getFullYear(), d.getMonth(), diff)
  return monday.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const uid = request.cookies.get('user_id')?.value
    if (!uid) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('week_start')
    const weekStart = weekStartParam ?? getCurrentWeekStart()

    const supabase = await createClient()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', uid as string)
      .single()

    if (userError || !user?.household_id) {
      return NextResponse.json(
        { error: 'Geen huishouden gevonden' },
        { status: 404 }
      )
    }

    const householdId = user.household_id

    const { data: rows, error: fetchError } = await supabase
      .from('weekmenu')
      .select('id, week_start, day_of_week, menu_text, link_url, link_title, created_at, updated_at')
      .eq('household_id', householdId)
      .eq('week_start', weekStart)
      .order('day_of_week', { ascending: true })

    if (fetchError) {
      return NextResponse.json(
        { error: 'Kon weekmenu niet ophalen' },
        { status: 500 }
      )
    }

    const existingDays = new Set((rows ?? []).map((r) => r.day_of_week))
    const allDays = [0, 1, 2, 3, 4, 5, 6]
    const missing = allDays.filter((d) => !existingDays.has(d))

    if (missing.length > 0) {
      const inserts = missing.map((day_of_week) => ({
        household_id: householdId,
        week_start: weekStart,
        day_of_week,
        menu_text: null,
        link_url: null,
        link_title: null,
      }))
      const { data: inserted, error: insertError } = await supabase
        .from('weekmenu')
        .insert(inserts)
        .select('id, week_start, day_of_week, menu_text, link_url, link_title, created_at, updated_at')

      if (insertError) {
        return NextResponse.json(
          { error: 'Kon weekmenu niet initialiseren' },
          { status: 500 }
        )
      }
      const combined = [...(rows ?? []), ...(inserted ?? [])].sort(
        (a, b) => a.day_of_week - b.day_of_week
      )
      return NextResponse.json({ days: combined, week_start: weekStart })
    }

    return NextResponse.json({
      days: rows ?? [],
      week_start: weekStart,
    })
  } catch (error) {
    console.error('Weekmenu GET error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value
    if (!userId) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await request.json()
    const { week_start, day_of_week, menu_text, link_url, link_title } = body as {
      week_start?: string
      day_of_week?: number
      menu_text?: string | null
      link_url?: string | null
      link_title?: string | null
    }

    if (
      typeof day_of_week !== 'number' ||
      day_of_week < 0 ||
      day_of_week > 6
    ) {
      return NextResponse.json(
        { error: 'Ongeldige day_of_week (0–6)' },
        { status: 400 }
      )
    }

    const weekStart =
      typeof week_start === 'string' && week_start
        ? week_start
        : getCurrentWeekStart()

    const supabase = await createClient()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user?.household_id) {
      return NextResponse.json(
        { error: 'Geen huishouden gevonden' },
        { status: 404 }
      )
    }

    const { data: existing } = await supabase
      .from('weekmenu')
      .select('id, menu_text, link_url, link_title')
      .eq('household_id', user.household_id)
      .eq('week_start', weekStart)
      .eq('day_of_week', day_of_week)
      .maybeSingle()

    const merged = {
      menu_text: existing?.menu_text ?? null,
      link_url: existing?.link_url ?? null,
      link_title: existing?.link_title ?? null,
    }
    if (body.hasOwnProperty('menu_text')) merged.menu_text = menu_text ?? null
    if (body.hasOwnProperty('link_url')) merged.link_url = link_url ?? null
    if (body.hasOwnProperty('link_title')) merged.link_title = link_title ?? null

    const { data: updated, error: upsertError } = await supabase
      .from('weekmenu')
      .upsert(
        {
          household_id: user.household_id,
          week_start: weekStart,
          day_of_week,
          menu_text: merged.menu_text,
          link_url: merged.link_url,
          link_title: merged.link_title,
        },
        { onConflict: 'household_id,week_start,day_of_week' }
      )
      .select('id, week_start, day_of_week, menu_text, link_url, link_title, updated_at')
      .single()

    if (upsertError) {
      return NextResponse.json(
        { error: 'Kon dag niet bijwerken' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Weekmenu PATCH error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
