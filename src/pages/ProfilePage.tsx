import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { usePremium } from '../lib/premium-context'
import { requestPushPermission } from '../lib/onesignal'
import { getNotificationPreferences, saveNotificationPreferences } from '../lib/notifications'
import { uploadAvatar } from '../lib/avatar'
import ImageCropper from '../components/ImageCropper'
import type { NotificationPreferences } from '../types/notifications'

function AvatarUpload() {
  const { user, profile, updateProfileAvatar } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    setCropSrc(URL.createObjectURL(file))
  }

  function closeCropper() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function handleCropConfirm(blob: Blob) {
    if (!user) return
    setUploading(true)
    setError(null)
    const { url, error: uploadError } = await uploadAvatar(user.id, blob)
    if (uploadError || !url) {
      setUploading(false)
      setError(uploadError?.message ?? 'Could not upload image.')
      closeCropper()
      return
    }
    const message = await updateProfileAvatar(url)
    setUploading(false)
    closeCropper()
    if (message) setError(message)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Profile picture"
            className="h-24 w-24 rounded-full border border-neutral-800 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-500">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2c0-2.76-3.58-5-8-5Z" />
            </svg>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-xs text-white">
            Saving…
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-sm font-medium text-brand-400 active:opacity-80 disabled:opacity-60"
      >
        Change photo
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      {cropSrc && <ImageCropper src={cropSrc} onCancel={closeCropper} onConfirm={handleCropConfirm} />}
    </div>
  )
}

function HandleCard() {
  const { profile, updateProfileHandle } = useAuth()
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEditing() {
    setUsername(profile?.username ?? '')
    setDisplayName(profile?.display_name ?? '')
    setError(null)
    setEditing(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const message = await updateProfileHandle({
      username: username.trim().toLowerCase(),
      display_name: displayName.trim(),
    })
    setSaving(false)
    if (message) {
      setError(message)
      return
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-neutral-800 p-4 text-sm"
      >
        <div className="space-y-1">
          <label htmlFor="display_name" className="text-xs text-neutral-400">
            Display name
          </label>
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            required
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="username" className="text-xs text-neutral-400">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            pattern="[a-z0-9_]{3,20}"
            title="3-20 characters: lowercase letters, numbers, underscores"
            required
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
          <p className="text-xs text-neutral-500">
            3-20 characters: lowercase letters, numbers, underscores.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="flex-1 rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-neutral-800 p-4 text-sm">
      <div>
        <p className="font-medium text-white">{profile?.display_name || 'Add a display name'}</p>
        <p className="text-neutral-400">{profile?.username ? `@${profile.username}` : 'No username yet'}</p>
      </div>
      <button
        type="button"
        onClick={startEditing}
        className="text-sm font-medium text-brand-400 active:opacity-80"
      >
        Edit
      </button>
    </div>
  )
}

function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const { isPremium, subscription, loading: premiumLoading } = usePremium()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [reminderTime, setReminderTime] = useState('18:00')
  const [enabling, setEnabling] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getNotificationPreferences(user.id).then(({ data }) => {
      if (data) {
        setPrefs(data)
        setReminderTime(data.reminder_time.slice(0, 5))
      }
    })
  }, [user])

  async function persist(enabled: boolean, time: string) {
    if (!user) return
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const { data, error } = await saveNotificationPreferences(user.id, {
      enabled,
      reminder_time: `${time}:00`,
      timezone,
    })
    if (!error) setPrefs(data)
  }

  async function handleToggle(nextEnabled: boolean) {
    setNotifError(null)

    if (nextEnabled) {
      setEnabling(true)
      const permission = await requestPushPermission()
      setEnabling(false)
      if (!permission) {
        setNotifError('Enable notifications for this site in your browser settings, then try again.')
        return
      }
    }

    await persist(nextEnabled, reminderTime)
  }

  async function handleTimeChange(value: string) {
    setReminderTime(value)
    if (prefs?.enabled) await persist(true, value)
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-white">Fitness Profile</h1>
      <p className="text-sm text-neutral-400">{user?.email}</p>

      <AvatarUpload />

      <HandleCard />

      {profile && (
        <div className="space-y-2 rounded-2xl border border-neutral-800 p-4 text-sm">
          <p className="flex justify-between">
            <span className="text-neutral-400">Fitness level</span>
            <span className="font-medium text-white">{profile.fitness_level}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-neutral-400">Goal</span>
            <span className="font-medium text-white">{profile.goal}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-neutral-400">Workout type</span>
            <span className="font-medium text-white">{profile.workout_type}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-neutral-400">Days per week</span>
            <span className="font-medium text-white">{profile.days_per_week}</span>
          </p>
        </div>
      )}

      <Link
        to="/premium"
        className="flex items-center justify-between rounded-2xl border border-neutral-800 p-4 active:opacity-80"
      >
        <span>
          <span className="block text-sm font-medium text-white">Membership</span>
          <span className="block text-xs text-neutral-400">
            {premiumLoading
              ? 'Checking…'
              : isPremium
                ? `Premium${subscription?.cancel_at_period_end ? ' (cancels at period end)' : ''}`
                : 'Free — upgrade for £4.99/mo'}
          </span>
        </span>
        <span className="text-neutral-500">→</span>
      </Link>

      <div className="space-y-3 rounded-2xl border border-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Daily reminder</p>
            <p className="text-xs text-neutral-400">Nudges you if your streak is at risk.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs?.enabled ?? false}
            onClick={() => handleToggle(!(prefs?.enabled ?? false))}
            disabled={enabling}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              prefs?.enabled ? 'bg-brand-500' : 'bg-neutral-700'
            }`}
          >
            <span
              className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${
                prefs?.enabled ? 'translate-x-[22px]' : ''
              }`}
            />
          </button>
        </div>

        {prefs?.enabled && (
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
          />
        )}

        {notifError && <p className="text-sm text-red-400">{notifError}</p>}
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        className="w-full rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white active:opacity-80"
      >
        Sign out
      </button>
    </div>
  )
}

export default ProfilePage
