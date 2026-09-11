import { supabase } from './supabase'
import type { BlockedUser, ReportReason } from '../types/social'

export async function fileReport(input: {
  reportedUserId: string
  reason: ReportReason
  details?: string
  messageId?: string | null
}) {
  const { error } = await supabase.from('reports').insert({
    reported_user_id: input.reportedUserId,
    reason: input.reason,
    details: input.details?.trim() ? input.details.trim() : null,
    message_id: input.messageId ?? null,
  })
  return { error }
}

export async function blockUser(target: {
  id: string
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}) {
  const { error } = await supabase.rpc('block_user', {
    p_target_id: target.id,
    p_username: target.username ?? null,
    p_display_name: target.displayName ?? null,
    p_avatar_url: target.avatarUrl ?? null,
  })
  return { error }
}

export async function unblockUser(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', currentUserId)
    .eq('blocked_id', targetId)
  return { error }
}

export async function getBlockedUsers(currentUserId: string) {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, blocked_username, blocked_display_name, blocked_avatar_url, created_at')
    .eq('blocker_id', currentUserId)
    .order('created_at', { ascending: false })

  if (error || !data) return { data: [] as BlockedUser[], error }

  const blocked = data.map(
    (row): BlockedUser => ({
      blockedId: row.blocked_id,
      username: row.blocked_username,
      displayName: row.blocked_display_name,
      avatarUrl: row.blocked_avatar_url,
      createdAt: row.created_at,
    }),
  )
  return { data: blocked, error: null }
}
