import { supabase } from './supabase'
import type { PublicProfile } from '../types/profile'

const PUBLIC_PROFILE_COLUMNS =
  'id, username, display_name, avatar_url, fitness_level, goal, workout_type, days_per_week'

export async function searchProfiles(query: string, excludeUserId?: string) {
  const term = query.trim()
  if (!term) return { data: [] as PublicProfile[], error: null }

  const escaped = term.replace(/[%_]/g, (match) => `\\${match}`)
  let request = supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`)
    .limit(20)

  if (excludeUserId) request = request.neq('id', excludeUserId)

  const { data, error } = await request
  return { data: (data as PublicProfile[] | null) ?? [], error }
}

export async function getPublicProfile(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  return { data: data as PublicProfile | null, error }
}
