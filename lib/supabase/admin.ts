import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client met service role key voor server-side admin operaties
 * (bijv. seed, migraties). Bypassed RLS.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE

  if (!url || !serviceRole) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE zijn vereist voor admin client')
  }

  return createClient(url, serviceRole)
}
