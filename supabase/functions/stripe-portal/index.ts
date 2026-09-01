// Supabase Edge Function: stripe-portal
//
// Called by a signed-in premium user (src/lib/premium.ts -> openBillingPortal)
// to open the Stripe Billing Portal, where they can update their payment
// method or cancel. Keep JWT verification ENABLED (the default).
//
// Requires these Edge Function secrets:
//   STRIPE_SECRET_KEY

import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

  if (!Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: 'Stripe is not configured' }, 500)

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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: row } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row?.stripe_customer_id) return json({ error: 'No billing account found' }, 400)

  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id as string,
    return_url: `${baseUrl}/premium`,
  })

  return json({ url: session.url })
})
