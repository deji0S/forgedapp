import { supabase } from './supabase'
import type { Streak } from '../types/tracking'

export interface RecoveryEligibility {
  eligible: boolean
  /** Number of missed days the recovery would bridge (1 or 2), when eligible. */
  missedDays: number
  reason: string | null
}

export interface RestoralStatus {
  remaining: number
  nextAvailable: string | null
}

export function isoDaysAgo(n: number): string {
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

/**
 * A streak that broke exactly "today" -- last activity was two days ago, so
 * the required daily-or-yesterday cadence lapsed as of this UTC calendar day.
 * Used to gate the purchasable restoral to its 24-hour offer window, which
 * (like the rest of the eligibility checks in this file) is expressed in
 * whole UTC days rather than a stored break timestamp.
 */
export function justBrokeWithin24h(streak: Streak | null): boolean {
  return recoveryEligibility(streak).missedDays === 1
}

/** Redirects the browser to Stripe Checkout for the one-time £1 streak restoral. */
export async function startStreakRestoralCheckout(): Promise<never> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-streak-restoral-checkout',
    { body: { returnUrl: window.location.origin } },
  )
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.url) throw new Error('Could not start the checkout. Please try again.')
  window.location.href = data.url
  // Redirecting away; nothing after this runs.
  return new Promise<never>(() => {})
}

/**
 * Remaining personal streak recoveries, from the same rolling window
 * public.recover_streak() enforces (30 days since the last use).
 */
export async function getStreakRecoveryStatus(userId: string): Promise<RestoralStatus> {
  const { data } = await supabase
    .from('streak_recoveries')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { remaining: 1, nextAvailable: null }

  const nextAvailable = new Date(new Date(data.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
  const remaining = nextAvailable.getTime() <= Date.now() ? 1 : 0
  return { remaining, nextAvailable: remaining === 0 ? nextAvailable.toISOString() : null }
}
