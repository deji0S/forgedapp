import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { usePremium } from '../lib/premium-context'
import { uploadAvatar } from '../lib/avatar'
import ImageCropper from '../components/ImageCropper'
import OptionGroup from '../components/OptionGroup'
import {
  DAYS_PER_WEEK,
  FITNESS_LEVELS,
  GOALS,
  profileDetails,
  WORKOUT_TYPES,
} from '../lib/profile-options'
import { getFollowCounts } from '../lib/social'
import { getStreak } from '../lib/tracking'
import { getStreakRecoveryStatus } from '../lib/streak'
import type { RestoralStatus } from '../lib/streak'
import type { FitnessLevel, Goal, Profile, WorkoutTypePreference } from '../types/profile'
import type { Streak } from '../types/tracking'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function RestoralStatusCard({ status }: { status: RestoralStatus | null }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-neutral-800 p-4 text-sm">
      <span className="text-neutral-400">Streak restoral</span>
      <span className="font-medium text-white">
        {status === null
          ? '—'
          : status.remaining > 0
            ? 'Available'
            : `Resets ${formatDate(status.nextAvailable!)}`}
      </span>
    </div>
  )
}

function FollowCounts({ userId }: { userId: string }) {
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null)

  useEffect(() => {
    getFollowCounts(userId).then(({ followers, following }) => setCounts({ followers, following }))
  }, [userId])

  return (
    <div className="flex divide-x divide-neutral-800 rounded-2xl border border-neutral-800 text-sm">
      <Link to="/profile/followers" className="flex-1 space-y-1 p-4 text-center active:opacity-80">
        <p className="text-lg font-semibold text-white">{counts?.followers ?? '—'}</p>
        <p className="text-neutral-400">Followers</p>
      </Link>
      <Link to="/profile/following" className="flex-1 space-y-1 p-4 text-center active:opacity-80">
        <p className="text-lg font-semibold text-white">{counts?.following ?? '—'}</p>
        <p className="text-neutral-400">Following</p>
      </Link>
    </div>
  )
}

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

function TrainingPrefsCard({ profile }: { profile: Profile }) {
  const { updateProfilePreferences } = useAuth()
  const [editing, setEditing] = useState(false)
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(profile.fitness_level)
  const [goal, setGoal] = useState<Goal>(profile.goal)
  const [workoutType, setWorkoutType] = useState<WorkoutTypePreference>(profile.workout_type)
  const [daysPerWeek, setDaysPerWeek] = useState<number>(profile.days_per_week)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEditing() {
    setFitnessLevel(profile.fitness_level)
    setGoal(profile.goal)
    setWorkoutType(profile.workout_type)
    setDaysPerWeek(profile.days_per_week)
    setError(null)
    setEditing(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const message = await updateProfilePreferences({
      fitness_level: fitnessLevel,
      goal,
      workout_type: workoutType,
      days_per_week: daysPerWeek,
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
        className="space-y-4 rounded-2xl border border-neutral-800 p-4 text-sm"
      >
        <div className="space-y-2">
          <p className="text-xs text-neutral-400">Fitness level</p>
          <OptionGroup options={FITNESS_LEVELS} value={fitnessLevel} onChange={setFitnessLevel} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-neutral-400">Goal</p>
          <OptionGroup options={GOALS} value={goal} onChange={setGoal} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-neutral-400">Workout type</p>
          <OptionGroup options={WORKOUT_TYPES} value={workoutType} onChange={setWorkoutType} />
        </div>

        <div className="space-y-2">
          <p className="text-xs text-neutral-400">Days per week</p>
          <OptionGroup
            options={DAYS_PER_WEEK.map((day) => ({ value: String(day), label: String(day) }))}
            value={String(daysPerWeek)}
            onChange={(value) => setDaysPerWeek(Number(value))}
          />
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
    <div className="space-y-3 rounded-2xl border border-neutral-800 p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-white">Training preferences</p>
        <button
          type="button"
          onClick={startEditing}
          className="text-sm font-medium text-brand-400 active:opacity-80"
        >
          Edit
        </button>
      </div>
      {profileDetails(profile).map((detail) => (
        <p key={detail.label} className="flex justify-between">
          <span className="text-neutral-400">{detail.label}</span>
          <span className="font-medium text-white">{detail.value}</span>
        </p>
      ))}
    </div>
  )
}

function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const { isPremium, subscription, loading: premiumLoading } = usePremium()
  const [streak, setStreak] = useState<Streak | null>(null)
  const [restoralStatus, setRestoralStatus] = useState<RestoralStatus | null>(null)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  useEffect(() => {
    if (!user) return
    getStreak(user.id).then(({ data }) => setStreak(data))
    getStreakRecoveryStatus(user.id).then(setRestoralStatus)
  }, [user])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold text-white">Fitness Profile</h1>
      <p className="text-sm text-neutral-400">{user?.email}</p>

      <AvatarUpload />

      <HandleCard />

      {user && <FollowCounts userId={user.id} />}

      <div className="flex items-center justify-between rounded-2xl border border-neutral-800 p-4 text-sm">
        <span className="text-neutral-400">Current streak</span>
        <span className="font-medium text-white">
          {streak?.current_streak ?? 0} {(streak?.current_streak ?? 0) === 1 ? 'day' : 'days'}
        </span>
      </div>

      <RestoralStatusCard status={restoralStatus} />

      {profile && <TrainingPrefsCard profile={profile} />}

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

      <Link
        to="/settings"
        className="flex items-center justify-between rounded-2xl border border-neutral-800 p-4 active:opacity-80"
      >
        <span>
          <span className="block text-sm font-medium text-white">Settings</span>
          <span className="block text-xs text-neutral-400">Password and email</span>
        </span>
        <span className="text-neutral-500">→</span>
      </Link>

      <button
        type="button"
        onClick={() => setConfirmingSignOut(true)}
        className="w-full rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white active:opacity-80"
      >
        Sign out
      </button>

      {confirmingSignOut && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setConfirmingSignOut(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="signout-title" className="text-sm font-medium text-white">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingSignOut(false)}
                className="flex-1 rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white active:opacity-80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white active:opacity-80"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
