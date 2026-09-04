import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { usePremium } from '../lib/premium-context'

interface PremiumGateProps {
  feature: string
  description?: string
  children: ReactNode
}

/**
 * Renders `children` for premium users; otherwise shows an upsell card linking
 * to /premium. While the subscription is still loading it renders a skeleton
 * so gated content never flashes in and out.
 */
export function PremiumGate({ feature, description, children }: PremiumGateProps) {
  const { isPremium, loading } = usePremium()

  if (loading) {
    return <div className="h-28 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
  }

  if (isPremium) return <>{children}</>

  return (
    <div className="space-y-2 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">Premium</p>
      <p className="text-sm font-medium text-neutral-900 dark:text-white">{feature} is a premium feature</p>
      {description && <p className="text-xs text-neutral-600 dark:text-neutral-400">{description}</p>}
      <Link
        to="/premium"
        className="mt-2 inline-block rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white active:opacity-80"
      >
        Upgrade for £4.99/mo
      </Link>
    </div>
  )
}
