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

export async function getFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    error: followers.error ?? following.error ?? null,
  }
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return { data: [] as PublicProfile[], error: null }

  const { data, error } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).in('id', ids)
  if (error) return { data: [] as PublicProfile[], error }

  const byId = new Map((data as PublicProfile[]).map((profile) => [profile.id, profile]))
  const ordered = ids.map((id) => byId.get(id)).filter((profile): profile is PublicProfile => !!profile)
  return { data: ordered, error: null }
}

export async function getFollowers(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
  if (error) return { data: [] as PublicProfile[], error }
  return getProfilesByIds(data.map((row) => row.follower_id))
}

export async function getFollowing(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
  if (error) return { data: [] as PublicProfile[], error }
  return getProfilesByIds(data.map((row) => row.following_id))
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
