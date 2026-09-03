import { supabase } from './supabase'
import { isoDaysAgo } from './streak'
import type { RecoveryEligibility, RestoralStatus } from './streak'
import type { ChatStreak } from '../types/social'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

// Records that `userId` opened the chat with `otherUserId` today. Idempotent
// per day (unique on user_id, other_user_id, opened_date) -- mirrors
// checkInToday in lib/tracking.ts. The insert-time RLS check requires
// mutual follow, so this silently fails (fine to ignore) if that's broken.
export async function recordChatOpen(userId: string, otherUserId: string) {
  const { error } = await supabase
    .from('chat_opens')
    .upsert(
      { user_id: userId, other_user_id: otherUserId, opened_date: todayIsoDate() },
      { onConflict: 'user_id,other_user_id,opened_date', ignoreDuplicates: true },
    )
  return { error }
}

export async function getChatStreak(userId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('chat_streaks')
    .select('current_streak, longest_streak, last_joint_date')
    .or(
      `and(user_a_id.eq.${userId},user_b_id.eq.${otherUserId}),` +
        `and(user_a_id.eq.${otherUserId},user_b_id.eq.${userId})`,
    )
    .maybeSingle()
  return { data: data as ChatStreak | null, error }
}

/**
 * Client-side mirror of the eligibility checks in public.recover_chat_streak
 * (migration 0018) — same 1-2 day lapse window as recoveryEligibility in
 * lib/streak.ts, applied to last_joint_date instead of last_activity_date.
 * The database function is the real gate.
 */
export function chatStreakRecoveryEligibility(streak: ChatStreak | null): RecoveryEligibility {
  if (!streak || !streak.last_joint_date) {
    return { eligible: false, missedDays: 0, reason: 'No joint streak to restore yet.' }
  }
  const last = streak.last_joint_date
  const yesterday = isoDaysAgo(1)
  const threeDaysAgo = isoDaysAgo(3)

  if (last >= yesterday) {
    return { eligible: false, missedDays: 0, reason: 'Your joint streak is still active.' }
  }
  if (last < threeDaysAgo) {
    return { eligible: false, missedDays: 0, reason: 'This joint streak lapsed too long ago to restore.' }
  }
  const missedDays = last === isoDaysAgo(2) ? 1 : 2
  return { eligible: true, missedDays, reason: null }
}

export async function recoverChatStreak(otherUserId: string) {
  return supabase.rpc('recover_chat_streak', { p_other_user_id: otherUserId }).single<ChatStreak>()
}

/**
 * Remaining joint streak restorals for this pair, from the same rolling
 * window public.recover_chat_streak() enforces (7 days since either
 * participant last used it for this pair).
 */
export async function getChatStreakRecoveryStatus(
  userId: string,
  otherUserId: string,
): Promise<RestoralStatus> {
  const { data } = await supabase
    .from('chat_streak_recoveries')
    .select('created_at')
    .or(
      `and(user_a_id.eq.${userId},user_b_id.eq.${otherUserId}),` +
        `and(user_a_id.eq.${otherUserId},user_b_id.eq.${userId})`,
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { remaining: 1, nextAvailable: null }

  const nextAvailable = new Date(new Date(data.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
  const remaining = nextAvailable.getTime() <= Date.now() ? 1 : 0
  return { remaining, nextAvailable: remaining === 0 ? nextAvailable.toISOString() : null }
}

// The streak row's own RLS already limits delivery to rows the current user
// is a party to; since chat_streaks has a composite key (no single filter
// column identifies "this pair"), we further check the pair client-side.
export function subscribeToChatStreak(
  userId: string,
  otherUserId: string,
  onChange: (streak: ChatStreak) => void,
) {
  const channel = supabase
    .channel(`chat-streak:${userId}:${otherUserId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_streaks' },
      (payload) => {
        const row = (payload.new ?? payload.old) as
          | (ChatStreak & { user_a_id: string; user_b_id: string })
          | undefined
        if (!row) return
        const pair = [row.user_a_id, row.user_b_id]
        if (pair.includes(userId) && pair.includes(otherUserId)) {
          onChange({
            current_streak: row.current_streak,
            longest_streak: row.longest_streak,
            last_joint_date: row.last_joint_date,
          })
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
