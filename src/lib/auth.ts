import { getSupabaseClient } from './supabase'

export async function getSession() {
  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}
