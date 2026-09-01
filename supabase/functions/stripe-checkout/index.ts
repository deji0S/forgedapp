// Supabase Edge Function: stripe-checkout
//
// Called by the signed-in client (src/lib/premium.ts -> startCheckout) to open
// a Stripe Checkout Session for the £4.99/month Forged Premium subscription.
//
// Flow:
//   1. Authenticate the caller from their Supabase JWT.
//   2. Find or create that user's Stripe customer, storing the id on
//      public.subscriptions so the webhook can always map events back to a user.
//   3. Find or create the recurring £4.99/mo GBP price (by lookup key) — no
//      manual Stripe dashboard setup required.
//   4. Return a Checkout Session URL for the client to redirect to.
//
// Keep JWT verification ENABLED for this function (the default).
//
// Requires these Edge Function secrets:
//   STRIPE_SECRET_KEY

import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const PRODUCT_NAME = 'Forged Premium'
const PRICE_LOOKUP_KEY = 'forged_premium_monthly'
const PRICE_UNIT_AMOUNT = 499 // pence
const PRICE_CURRENCY = 'gbp'

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

async function getOrCreatePriceId(): Promise<string> {
  const existing = await stripe.prices.list({
    lookup_keys: [PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  })
  if (existing.data[0]) return existing.data[0].id

  const products = await stripe.products.search({
    query: `name:'${PRODUCT_NAME}' AND active:'true'`,
    limit: 1,
  })
  const productId = products.data[0]?.id ?? (await stripe.products.create({ name: PRODUCT_NAME })).id

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: PRICE_UNIT_AMOUNT,
    currency: PRICE_CURRENCY,
    recurring: { interval: 'month' },
    lookup_key: PRICE_LOOKUP_KEY,
  })
  return price.id
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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Find or create the Stripe customer for this user.
  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = existing?.stripe_customer_id as string | null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    // Seed the row now so the webhook can resolve this user even if the
    // subscription event is processed before checkout.session.completed.
    await admin
      .from('subscriptions')
      .upsert(
        { user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
  }

  // 2. Resolve the recurring price.
  const priceId = await getOrCreatePriceId()

  // 3. Create the Checkout Session.
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    subscription_data: { metadata: { supabase_user_id: user.id } },
    success_url: `${baseUrl}/premium?checkout=success`,
    cancel_url: `${baseUrl}/premium?checkout=cancel`,
  })

  return json({ url: session.url })
})
