// Supabase Edge Function: resolve-username
//
// Called from the sign-in form (src/lib/auth-context.tsx -> signIn) when the
// user typed a username instead of an email. Looks up the account's email so
// the client can then call signInWithPassword with it. Keep JWT verification
// ENABLED (the default) — the anon key satisfies it; there is no user session
// yet at sign-in time.
//
// Why a function and not a client query: profiles.username is readable by its
// owner only under RLS, and we specifically do NOT want a public client-side
// path that maps usernames to emails. The service role stays server-side; the
// caller still needs the password to actually sign in.
//
// Requires these Edge Function secrets (all auto-provided):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const { username } = await req.json().catch(() => ({}))
  const handle = typeof username === 'string' ? username.trim().toLowerCase() : ''
  if (!handle) return json({ error: 'Enter your email or username.' }, 400)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id')
    .eq('username', handle)
    .maybeSingle()
  if (error) {
    console.error('resolve-username: profiles lookup failed', error)
    return json({ error: 'Could not sign you in. Please try again.' }, 500)
  }
  if (!profile) return json({ error: "We couldn't find an account with that username." }, 404)

  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(
    profile.id as string,
  )
  if (userError || !userResult?.user?.email) {
    console.error('resolve-username: getUserById failed', userError)
    return json({ error: 'Could not sign you in. Please try again.' }, 500)
  }

  return json({ email: userResult.user.email })
})
