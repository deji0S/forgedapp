import { supabase } from './supabase'
import type { Subscription } from '../types/premium'

// Statuses Stripe considers "the customer has access". `past_due` deliberately
// still counts as premium during Stripe's dunning/retry window.
const PREMIUM_STATUSES = new Set<Subscription['status']>(['active', 'trialing'])

export function isPremiumSubscription(sub: Subscription | null): boolean {
  return sub?.status != null && PREMIUM_STATUSES.has(sub.status)
}

export async function getSubscription(userId: string) {
  return supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<Subscription>()
}

async function invokeRedirect(fn: 'stripe-checkout' | 'stripe-portal'): Promise<never> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(fn, {
    body: { returnUrl: window.location.origin },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.url) throw new Error('Could not start the session. Please try again.')
  window.location.href = data.url
  // Redirecting away; nothing after this runs.
  return new Promise<never>(() => {})
}

/** Redirects the browser to Stripe Checkout for the £4.99/mo subscription. */
export function startCheckout() {
  return invokeRedirect('stripe-checkout')
}

/** Redirects the browser to the Stripe Billing Portal (manage / cancel). */
export function openBillingPortal() {
  return invokeRedirect('stripe-portal')
}
