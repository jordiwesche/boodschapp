import { createClient } from './supabase/server'
import { cookies } from 'next/headers'

export async function getCurrentUser() {
  const userId = (await cookies()).get('user_id')?.value
  
  if (!userId) {
    return null
  }

  const supabase = await createClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, first_name, household_id')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return null
  }

  return user
}

export async function getHousehold(householdId: string) {
  const supabase = await createClient()
  const { data: household, error } = await supabase
    .from('households')
    .select('id, name')
    .eq('id', householdId)
    .single()

  if (error || !household) {
    return null
  }

  return household
}
