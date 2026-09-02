import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-sm text-neutral-400">Loading…</p>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/auth" replace />

  return children
}

export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/auth" replace />
  if (!profile?.onboarded) return <Navigate to="/onboarding" replace />

  return children
}
