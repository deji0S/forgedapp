import { supabase } from './supabase'
import type { Streak } from '../types/tracking'

export interface RecoveryEligibility {
  eligible: boolean
  /** Number of missed days the recovery would bridge (1 or 2), when eligible. */
  missedDays: number
  reason: string | null
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/**
 * Client-side mirror of the eligibility checks in public.recover_streak
 * (migration 0007) — used only to decide whether to surface the recovery UI.
 * The database function is the real gate.
 */
export function recoveryEligibility(streak: Streak | null): RecoveryEligibility {
  if (!streak || !streak.last_activity_date) {
    return { eligible: false, missedDays: 0, reason: 'No streak to recover yet.' }
  }
  const last = streak.last_activity_date
  const yesterday = isoDaysAgo(1)
  const threeDaysAgo = isoDaysAgo(3)

  if (last >= yesterday) {
    return { eligible: false, missedDays: 0, reason: 'Your streak is still active.' }
  }
  if (last < threeDaysAgo) {
    return { eligible: false, missedDays: 0, reason: 'This streak lapsed too long ago to recover.' }
  }
  // last is isoDaysAgo(2) or isoDaysAgo(3) -> 1 or 2 missed days.
  const missedDays = last === isoDaysAgo(2) ? 1 : 2
  return { eligible: true, missedDays, reason: null }
}

export async function recoverStreak() {
  return supabase.rpc('recover_streak').single<Streak>()
}
