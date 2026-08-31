// Supabase Edge Function: streak-reminder
//
// Invoked on a schedule (every 15 minutes, see migration 0005) by pg_cron.
// For every user whose daily reminder time falls in the current 15-minute
// window (in their own timezone), checks whether they have an active streak
// they haven't protected yet today, and if so sends one batched push
// notification via OneSignal, targeting all of them by external_id (the
// Supabase user id — see src/lib/onesignal.ts, which calls OneSignal.login
// with that id on sign-in).
//
// Runs with the service-role key (auto-provided — no secret to configure)
// since there's no calling user's JWT to scope RLS to; it must read across
// all users' preferences and streaks.
//
// Requires these secrets to be set on this project (Edge Functions > Secrets):
//   ONESIGNAL_APP_ID
//   ONESIGNAL_REST_API_KEY

import { createClient } from 'npm:@supabase/supabase-js@2'

const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications'
const REMINDER_WINDOW_MINUTES = 15

// Local "minutes since midnight" for a timezone, from a UTC instant.
function localMinutesSinceMidnight(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

// Wraparound-safe: true when `nowMinutes` is within the window starting at
// `reminderMinutes`.
function isWithinReminderWindow(nowMinutes: number, reminderMinutes: number): boolean {
  return ((nowMinutes - reminderMinutes + 1440) % 1440) < REMINDER_WINDOW_MINUTES
}

Deno.serve(async (_req) => {
  const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID')
  const oneSignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY')
  if (!oneSignalAppId || !oneSignalApiKey) {
    return new Response(JSON.stringify({ error: 'OneSignal is not configured' }), { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('user_id, reminder_time, timezone')
    .eq('enabled', true)

  if (prefsError) {
    return new Response(JSON.stringify({ error: prefsError.message }), { status: 500 })
  }

  const now = new Date()
  const dueUserIds = (prefs ?? [])
    .filter((pref) =>
      isWithinReminderWindow(
        localMinutesSinceMidnight(now, pref.timezone),
        parseTimeToMinutes(pref.reminder_time),
      ),
    )
    .map((pref) => pref.user_id)

  if (dueUserIds.length === 0) {
    return new Response(JSON.stringify({ checked: prefs?.length ?? 0, due: 0, notified: 0 }), { status: 200 })
  }

  // "Today" here matches the same UTC calendar day workout_logs.logged_date
  // and streaks.last_activity_date already use (see migration 0002) — kept
  // consistent with the streak trigger rather than converted to local time.
  const today = now.toISOString().slice(0, 10)

  const { data: streaks, error: streaksError } = await supabase
    .from('streaks')
    .select('user_id, last_activity_date')
    .in('user_id', dueUserIds)
    .gt('current_streak', 0)

  if (streaksError) {
    return new Response(JSON.stringify({ error: streaksError.message }), { status: 500 })
  }

  const atRiskUserIds = (streaks ?? [])
    .filter((streak) => streak.last_activity_date !== today)
    .map((streak) => streak.user_id)

  if (atRiskUserIds.length === 0) {
    return new Response(
      JSON.stringify({ checked: prefs?.length ?? 0, due: dueUserIds.length, notified: 0 }),
      { status: 200 },
    )
  }

  const oneSignalResponse = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${oneSignalApiKey}`,
    },
    body: JSON.stringify({
      app_id: oneSignalAppId,
      target_channel: 'push',
      include_aliases: { external_id: atRiskUserIds },
      headings: { en: 'Your streak needs you 🔥' },
      contents: { en: "You haven't logged a workout today — keep your streak alive before the day ends." },
    }),
  })

  return new Response(
    JSON.stringify({
      checked: prefs?.length ?? 0,
      due: dueUserIds.length,
      notified: atRiskUserIds.length,
      oneSignalStatus: oneSignalResponse.status,
    }),
    { status: 200 },
  )
})
