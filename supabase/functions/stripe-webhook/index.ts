// Supabase Edge Function: stripe-webhook
//
// Receives Stripe webhook events and keeps public.subscriptions in sync, which
// is what drives premium access across the app (public.is_premium).
//
// IMPORTANT: JWT verification MUST be DISABLED for this function — Stripe calls
// it with a signature header, not a Supabase JWT. In the dashboard: Edge
// Functions > stripe-webhook > Details > "Verify JWT with legacy secret" OFF
// (or deploy with `verify_jwt = false`). Authenticity is instead enforced by
// verifying the Stripe-Signature against STRIPE_WEBHOOK_SECRET below.
//
// Point a Stripe webhook endpoint at:
//   https://bozzojpwswuvbmqazvle.supabase.co/functions/v1/stripe-webhook
// subscribed to at least:
//   checkout.session.completed
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//
// Requires these Edge Function secrets:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET

import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function customerIdOf(value: string | { id: string } | null): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

// Stripe moved subscription.current_period_end onto the subscription item in
// recent API versions; read whichever is present.
function periodEndIso(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0] as { current_period_end?: number } | undefined
  const unix =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    null
  return unix ? new Date(unix * 1000).toISOString() : null
}

async function resolveUserId(
  subscription: Stripe.Subscription,
  fallbackUserId?: string,
): Promise<string | null> {
  const fromMeta = subscription.metadata?.supabase_user_id
  if (fromMeta) return fromMeta
  if (fallbackUserId) return fallbackUserId

  const customerId = customerIdOf(subscription.customer as string | { id: string })
  if (customerId) {
    const { data } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    if (data?.user_id) return data.user_id as string

    try {
      const customer = await stripe.customers.retrieve(customerId)
      if (!customer.deleted && customer.metadata?.supabase_user_id) {
        return customer.metadata.supabase_user_id
      }
    } catch {
      // fall through to null
    }
  }
  return null
}

async function upsertFromSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId?: string,
): Promise<void> {
  const userId = await resolveUserId(subscription, fallbackUserId)
  if (!userId) {
    console.error('stripe-webhook: could not resolve Supabase user for subscription', subscription.id)
    return
  }

  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerIdOf(subscription.customer as string | { id: string }),
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: subscription.items?.data?.[0]?.price?.id ?? null,
      current_period_end: periodEndIso(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
}

Deno.serve(async (req) => {
  if (!Deno.env.get('STRIPE_SECRET_KEY') || !webhookSecret) {
    return new Response('Stripe is not configured', { status: 500 })
  }

  const signature = req.headers.get('Stripe-Signature')
  if (!signature) return new Response('Missing Stripe-Signature', { status: 400 })

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    )
  } catch (err) {
    return new Response(`Signature verification failed: ${(err as Error).message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          const subscription = await stripe.subscriptions.retrieve(subId)
          await upsertFromSubscription(subscription, session.client_reference_id ?? undefined)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(event.data.object as Stripe.Subscription)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('stripe-webhook handler error', err)
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
