import bcrypt from 'bcryptjs'
import { createClient } from './supabase/server'

const SALT_ROUNDS = 10

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export async function checkUserExists(email: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()
  
  return !error && data !== null
}

export async function findPendingInvitation(email: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('household_invitations')
    .select('id, household_id, email')
    .eq('email', email.toLowerCase().trim())
    .is('accepted_at', null)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data
}
