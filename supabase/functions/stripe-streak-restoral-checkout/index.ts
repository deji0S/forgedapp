// Supabase Edge Function: stripe-streak-restoral-checkout
//
// Called by the signed-in client (src/lib/streak.ts -> startStreakRestoralCheckout)
// to open a Stripe Checkout Session for the one-time £1 streak restoral.
// Distinct from stripe-checkout (the £4.99/mo Premium subscription):
//   - mode: 'payment' (one-time), not 'subscription'.
//   - Uses a fixed, already-created Stripe Price rather than finding/creating one.
//   - Does not touch public.subscriptions or create a Stripe customer record --
//     a bare Checkout Session is enough for a one-time purchase.
//
// The webhook identifies this purchase type via metadata.type = 'streak_restoral'
// (see supabase/functions/stripe-webhook), then calls
// public.apply_purchased_streak_restoral() with the Supabase user id.
//
// Keep JWT verification ENABLED for this function (the default).
//
// Requires these Edge Function secrets:
//   STRIPE_SECRET_KEY

import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const STREAK_RESTORAL_PRICE_ID = 'price_1UCSQ1QfDzhTmr7Bs2dtyblV'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    return json({ error: 'Stripe is not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'Not authenticated' }, 401)

  const { returnUrl } = await req.json().catch(() => ({}))
  const baseUrl = typeof returnUrl === 'string' && returnUrl ? returnUrl.replace(/\/$/, '') : null
  if (!baseUrl) return json({ error: 'Missing returnUrl' }, 400)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: STREAK_RESTORAL_PRICE_ID, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { type: 'streak_restoral', supabase_user_id: user.id },
    success_url: `${baseUrl}/?restoral=success`,
    cancel_url: `${baseUrl}/?restoral=cancel`,
  })

  return json({ url: session.url })
})
