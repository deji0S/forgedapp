// Supabase Edge Function: delete-account
//
// Called by a signed-in user (src/lib/auth-context.tsx -> deleteAccount) to
// permanently and irreversibly delete their account. Keep JWT verification
// ENABLED (the default) so we always act on the caller's own identity.
//
// The client sends { confirmation } — the user must have typed either their
// own email address or their current password. We re-verify that server-side
// (never trust the client's own check) before doing anything destructive.
//
// Deletion order:
//   1. Best-effort: cancel any live Stripe subscription so a deleted user is
//      not still billed. Needs STRIPE_SECRET_KEY; skipped if unset.
//   2. Best-effort: remove the user's avatar files from the `avatars` bucket
//      (storage objects do not cascade on auth user deletion).
//   3. auth.admin.deleteUser(user.id) — every public table has an
//      `on delete cascade` FK to auth.users, so this removes profiles,
//      workout_plans, workout_logs, workout_insights, streaks,
//      habit_checkins, notification_preferences, subscriptions and
//      streak_recoveries along with the auth row.
//
// Requires these Edge Function secrets:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  (auto-provided)
//   STRIPE_SECRET_KEY                                           (optional)

import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user || !user.email) return json({ error: 'Not authenticated' }, 401)

  const { confirmation } = await req.json().catch(() => ({}))
  if (typeof confirmation !== 'string' || !confirmation.trim()) {
    return json({ error: 'Type your email or password to confirm.' }, 400)
  }
  const answer = confirmation.trim()

  // Re-verify the confirmation server-side: it must be the user's own email
  // (case-insensitive) or their current password.
  const emailMatches = answer.toLowerCase() === user.email.toLowerCase()
  let passwordMatches = false
  if (!emailMatches) {
    const check = createClient(supabaseUrl, anonKey)
    const { error: pwError } = await check.auth.signInWithPassword({
      email: user.email,
      password: answer,
    })
    passwordMatches = !pwError
  }
  if (!emailMatches && !passwordMatches) {
    return json({ error: "That doesn't match your email or password." }, 403)
  }

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // 1. Best-effort Stripe cancellation.
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (stripeKey) {
    try {
      const { data: sub } = await admin
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (sub?.stripe_subscription_id) {
        const stripe = new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() })
        await stripe.subscriptions.cancel(sub.stripe_subscription_id as string)
      }
    } catch (err) {
      console.error('delete-account: Stripe cancellation failed', err)
    }
  }

  // 2. Best-effort avatar cleanup (storage objects don't cascade).
  try {
    const { data: files } = await admin.storage.from('avatars').list(user.id)
    if (files?.length) {
      await admin.storage
        .from('avatars')
        .remove(files.map((f) => `${user.id}/${f.name}`))
    }
  } catch (err) {
    console.error('delete-account: avatar cleanup failed', err)
  }

  // 3. Delete the auth user — cascades every public table.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('delete-account: deleteUser failed', deleteError)
    return json({ error: 'Could not delete your account. Please try again.' }, 500)
  }

  return json({ ok: true })
})
