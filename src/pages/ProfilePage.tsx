import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { usePremium } from '../lib/premium-context'
import { requestPushPermission } from '../lib/onesignal'
import { getNotificationPreferences, saveNotificationPreferences } from '../lib/notifications'
import type { NotificationPreferences } from '../types/notifications'

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
      <h1 className="text-2xl font-semibold text-white">Profile</h1>
      <p className="text-sm text-neutral-400">{user?.email}</p>

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
