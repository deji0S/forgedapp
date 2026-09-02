import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

const inputClass =
  'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none'

function ChangePasswordCard() {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setDone(false)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)
    const message = await changePassword(currentPassword, newPassword)
    setSaving(false)

    if (message) {
      setError(message)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setDone(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-neutral-800 p-4">
      <div>
        <p className="text-sm font-medium text-white">Change password</p>
        <p className="text-xs text-neutral-400">Enter your current password to set a new one.</p>
      </div>

      <input
        type="password"
        required
        autoComplete="current-password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        className={inputClass}
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        placeholder="New password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        className={inputClass}
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        className={inputClass}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {done && <p className="text-sm text-green-400">Password updated.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}

function ChangeEmailCard() {
  const { user, changeEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSent(false)

    if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setError('That is already your email address.')
      return
    }

    setSaving(true)
    const message = await changeEmail(email.trim())
    setSaving(false)

    if (message) {
      setError(message)
      return
    }

    setEmail('')
    setSent(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-neutral-800 p-4">
      <div>
        <p className="text-sm font-medium text-white">Change email</p>
        <p className="text-xs text-neutral-400">
          Currently <span className="text-neutral-300">{user?.email}</span>
        </p>
      </div>

      <input
        type="email"
        required
        autoComplete="email"
        placeholder="New email address"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className={inputClass}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {sent && (
        <p className="text-sm text-green-400">
          Confirmation links sent. Check both your current and new inbox — the change takes effect
          once you confirm from both.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
      >
        {saving ? 'Sending…' : 'Send confirmation'}
      </button>
    </form>
  )
}

function Settings() {
  return (
    <div className="space-y-4 p-4">
      <Link to="/profile" className="text-sm font-medium text-neutral-400">
        ← Fitness Profile
      </Link>

      <h1 className="text-2xl font-semibold text-white">Settings</h1>

      <ChangePasswordCard />
      <ChangeEmailCard />
    </div>
  )
}

export default Settings
