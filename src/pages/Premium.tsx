import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePremium } from '../lib/premium-context'
import { openBillingPortal, startCheckout } from '../lib/premium'

// TODO(you): replace this with your real product description / marketing copy.
const PRODUCT_TAGLINE =
  'Forged Premium unlocks smarter training — personalized coaching, deeper analytics, and a safety net for your streak.'

const PREMIUM_FEATURES = [
  {
    title: 'AI coach',
    body: 'Personalized, adaptive guidance based on your consistency, training volume, and how your sessions feel.',
  },
  {
    title: 'Advanced analytics',
    body: 'Weekly volume trends, top exercises, personal records, and your effort breakdown over time.',
  },
  {
    title: 'Streak recovery',
    body: 'Missed a day? Restore a lapsed streak once every 30 days so one slip doesn’t undo weeks of work.',
  },
]

function priceBlock() {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
      <p className="text-3xl font-semibold text-neutral-900 dark:text-white">
        £4.99
        <span className="text-base font-normal text-neutral-600 dark:text-neutral-400">/month</span>
      </p>
      <p className="mt-1 text-xs text-neutral-500">Cancel anytime.</p>
    </div>
  )
}

function Premium() {
  const { isPremium, subscription, loading, refresh } = usePremium()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const checkoutResult = params.get('checkout')

  useEffect(() => {
    if (checkoutResult !== 'success') return
    // The webhook that flips premium status can land a beat after the redirect.
    const timers = [0, 2000, 5000, 10000].map((ms) => window.setTimeout(() => refresh(), ms))
    return () => timers.forEach(window.clearTimeout)
  }, [checkoutResult, refresh])

  async function handle(action: 'checkout' | 'portal') {
    setBusy(true)
    setError(null)
    try {
      await (action === 'checkout' ? startCheckout() : openBillingPortal())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <Link to="/" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white">Forged Premium</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{PRODUCT_TAGLINE}</p>
      </div>

      {checkoutResult === 'success' && !isPremium && (
        <p className="rounded-xl bg-blue-500/15 p-3 text-sm text-blue-700 dark:text-blue-300">
          Payment received — activating your premium access…
        </p>
      )}
      {checkoutResult === 'cancel' && (
        <p className="rounded-xl bg-neutral-200 dark:bg-neutral-800 p-3 text-sm text-neutral-700 dark:text-neutral-300">
          Checkout canceled — no charge was made.
        </p>
      )}

      {priceBlock()}

      <ul className="space-y-3">
        {PREMIUM_FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{feature.title}</p>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{feature.body}</p>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="h-12 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
      ) : isPremium ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-blue-500/15 p-3 text-center text-sm font-medium text-blue-700 dark:text-blue-300">
            You’re on Premium
            {subscription?.cancel_at_period_end ? ' — cancels at period end' : ''}.
          </p>
          <button
            type="button"
            onClick={() => handle('portal')}
            disabled={busy}
            className="w-full rounded-xl bg-neutral-200 dark:bg-neutral-800 py-3 text-sm font-semibold text-neutral-900 dark:text-white pressable disabled:opacity-60"
          >
            {busy ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => handle('checkout')}
          disabled={busy}
          className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white pressable disabled:opacity-60"
        >
          {busy ? 'Redirecting…' : 'Upgrade to Premium'}
        </button>
      )}
    </div>
  )
}

export default Premium
