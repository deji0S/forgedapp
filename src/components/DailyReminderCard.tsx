import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { requestPushPermission } from '../lib/onesignal'
import { getNotificationPreferences, saveNotificationPreferences } from '../lib/notifications'
import type { NotificationPreferences } from '../types/notifications'

export default function DailyReminderCard() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [reminderTime, setReminderTime] = useState('18:00')
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const { data, error: saveError } = await saveNotificationPreferences(user.id, {
      enabled,
      reminder_time: `${time}:00`,
      timezone,
    })
    if (!saveError) setPrefs(data)
  }

  async function handleToggle(nextEnabled: boolean) {
    setError(null)

    if (nextEnabled) {
      setEnabling(true)
      const permission = await requestPushPermission()
      setEnabling(false)
      if (!permission) {
        setError('Enable notifications for this site in your browser settings, then try again.')
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
    <section className="space-y-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Daily reminder</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Nudges you if your streak is at risk.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs?.enabled ?? false}
          onClick={() => handleToggle(!(prefs?.enabled ?? false))}
          disabled={enabling}
          className={`h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            prefs?.enabled ? 'bg-black dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
        >
          <span
            className={`block h-5 w-5 translate-x-0.5 rounded-full shadow-sm transition-transform ${
              prefs?.enabled ? 'translate-x-[22px] bg-white dark:bg-black' : 'bg-white'
            }`}
          />
        </button>
      </div>

      {prefs?.enabled && (
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-white focus:border-black dark:focus:border-white focus:outline-none"
        />
      )}

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </section>
  )
}
