import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { BrandedSplash } from './BrandedSplash'
import { useAuth } from '../lib/auth-context'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <BrandedSplash />
  if (!session) return <Navigate to="/auth" replace />

  return children
}

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <BrandedSplash />
  if (!session) return <Navigate to="/auth" replace />
  if (!profile?.onboarded) return <Navigate to="/onboarding" replace />

  return children
}
