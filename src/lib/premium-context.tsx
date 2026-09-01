import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './auth-context'
import { getSubscription, isPremiumSubscription } from './premium'
import type { Subscription } from '../types/premium'

interface PremiumContextValue {
  subscription: Subscription | null
  isPremium: boolean
  loading: boolean
  refresh: () => Promise<void>
}

const PremiumContext = createContext<PremiumContextValue | null>(null)

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await getSubscription(user.id)
    setSubscription(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Premium status flips out-of-band via the Stripe webhook, so re-check when
  // the user returns to the tab (e.g. coming back from Checkout or the portal).
  useEffect(() => {
    function onFocus() {
      refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return (
    <PremiumContext.Provider
      value={{
        subscription,
        isPremium: isPremiumSubscription(subscription),
        loading,
        refresh,
      }}
    >
      {children}
    </PremiumContext.Provider>
  )
}

export function usePremium() {
  const ctx = useContext(PremiumContext)
  if (!ctx) throw new Error('usePremium must be used within a PremiumProvider')
  return ctx
}
