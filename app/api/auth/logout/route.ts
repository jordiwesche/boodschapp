import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  
  // Sign out from Supabase Auth
  await supabase.auth.signOut()
  
  const response = NextResponse.json({ success: true })
  response.cookies.delete('user_id')
  return response
}
