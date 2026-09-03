import { supabase } from './supabase'
import type { PublicProfile } from '../types/profile'
import type { FollowState } from '../types/social'

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

export async function getFollowState(currentUserId: string, targetId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, following_id')
    .or(
      `and(follower_id.eq.${currentUserId},following_id.eq.${targetId}),` +
        `and(follower_id.eq.${targetId},following_id.eq.${currentUserId})`,
    )

  if (error) return { data: null as FollowState | null, error }

  const rows = data ?? []
  const state: FollowState = {
    isFollowing: rows.some((row) => row.follower_id === currentUserId),
    isFollowedBy: rows.some((row) => row.follower_id === targetId),
  }
  return { data: state, error: null }
}

export async function followUser(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: currentUserId, following_id: targetId })
  return { error }
}

export async function unfollowUser(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', currentUserId)
    .eq('following_id', targetId)
  return { error }
}
