import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'

function AuthPage() {
  const { session, profile, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  if (session) return <Navigate to={profile ? '/' : '/onboarding'} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const message = mode === 'sign-in' ? await signIn(email, password) : await signUp(email, password)
    setSubmitting(false)

    if (message) {
      setError(message)
      return
    }
    if (mode === 'sign-up') setCheckEmail(true)
  }

  return (
    <div className="flex min-h-svh flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          {mode === 'sign-in'
            ? 'Sign in to keep tracking your workouts.'
            : 'Sign up to get started with Forged.'}
        </p>
      </div>

      {checkEmail ? (
        <p className="text-sm text-neutral-300">
          Check your inbox at <span className="font-medium">{email}</span> to confirm your account.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
      )}

      {!checkEmail && (
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setError(null)
          }}
          className="text-sm font-medium text-brand-400"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      )}
    </div>
  )
}

export default AuthPage
