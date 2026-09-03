import { supabase } from './supabase'
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
