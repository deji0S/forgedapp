import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ForgedLogo } from '../../components/AppHeader'
import { AuthBackground } from '../../components/AuthBackground'
import { useAuth } from '../../lib/auth-context'

function AuthPage() {
  const { session, profile, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  if (session) return <Navigate to={profile?.onboarded ? '/' : '/onboarding'} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const message =
      mode === 'sign-in'
        ? await signIn(identifier, password)
        : await signUp(identifier, password, username)
    setSubmitting(false)

    if (message) {
      setError(message)
      return
    }
    if (mode === 'sign-up') setCheckEmail(true)
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden p-6">
      <AuthBackground />
      <div className="relative flex flex-1 flex-col justify-center gap-6">
        <div className="flex justify-center">
          <ForgedLogo className="h-14" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {mode === 'sign-in'
              ? 'Sign in to keep tracking your workouts.'
              : 'Sign up to get started with Forged.'}
          </p>
        </div>

        {checkEmail ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Check your inbox at <span className="font-medium">{identifier}</span> to confirm your
            account.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'sign-up' && (
              <div className="space-y-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-3">
                <label htmlFor="username" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  pattern="[a-z0-9_]{3,20}"
                  title="3–20 characters: lowercase letters, numbers, underscores"
                  placeholder="your_handle"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-3 py-2 text-sm text-neutral-900 dark:text-white focus:border-black dark:focus:border-white focus:outline-none"
                />
                <p className="text-xs text-neutral-500">
                  3–20 characters: lowercase letters, numbers, underscores. This is how others find you.
                </p>
              </div>
            )}
            {mode === 'sign-in' ? (
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Email or Username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:border-black dark:focus:border-white focus:outline-none"
              />
            ) : (
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:border-black dark:focus:border-white focus:outline-none"
              />
            )}
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:border-black dark:focus:border-white focus:outline-none"
            />
            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-black dark:bg-white py-3 text-sm font-semibold text-white dark:text-black pressable disabled:opacity-60"
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
            className="text-sm font-medium text-neutral-900 dark:text-white"
          >
            {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        )}
      </div>
    </div>
  )
}

export default AuthPage
