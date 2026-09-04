import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { PremiumGate } from '../components/PremiumGate'
import { getStreak, listWorkoutLogs } from '../lib/tracking'
import {
  feedbackBreakdown,
  personalRecords,
  summarize,
  topExercises,
  weeklyVolume,
} from '../lib/analytics'
import type { Streak, WorkoutLog } from '../types/tracking'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-xs text-neutral-600 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{value}</p>
    </div>
  )
}

function AdvancedAnalytics({ logs }: { logs: WorkoutLog[] }) {
  const weeks = useMemo(() => weeklyVolume(logs, 6), [logs])
  const top = useMemo(() => topExercises(logs, 5), [logs])
  const records = useMemo(() => personalRecords(logs, 5), [logs])
  const feedback = useMemo(() => feedbackBreakdown(logs), [logs])
  const maxWeekReps = Math.max(1, ...weeks.map((w) => w.reps))
  const feedbackTotal = feedback.too_easy + feedback.just_right + feedback.too_hard

  if (logs.length === 0) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">Log a workout to unlock your trends.</p>
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Weekly volume (reps)</h3>
        <div className="flex items-end gap-2">
          {weeks.map((week) => (
            <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-blue-500"
                style={{ height: `${Math.round((week.reps / maxWeekReps) * 96) + 4}px` }}
              />
              <span className="text-[10px] text-neutral-500">{week.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Top exercises</h3>
        {top.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No exercises logged yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {top.map((ex) => (
              <li key={ex.name} className="flex justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">{ex.name}</span>
                <span className="text-neutral-500">
                  {ex.sets} sets · {ex.reps} reps
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Personal records</h3>
        {records.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Add weights to your exercises to track PRs.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {records.map((pr) => (
              <li key={pr.name} className="flex justify-between">
                <span className="text-neutral-700 dark:text-neutral-300">{pr.name}</span>
                <span className="text-neutral-500">{pr.weightKg} kg</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">How sessions felt</h3>
        {feedbackTotal === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Leave feedback after a workout to see this.</p>
        ) : (
          <div className="flex overflow-hidden rounded-lg text-center text-[10px] font-medium text-white">
            {feedback.too_easy > 0 && (
              <div className="bg-blue-700 py-1" style={{ width: `${(feedback.too_easy / feedbackTotal) * 100}%` }}>
                Easy
              </div>
            )}
            {feedback.just_right > 0 && (
              <div className="bg-blue-500 py-1" style={{ width: `${(feedback.just_right / feedbackTotal) * 100}%` }}>
                Right
              </div>
            )}
            {feedback.too_hard > 0 && (
              <div className="bg-neutral-600 py-1" style={{ width: `${(feedback.too_hard / feedbackTotal) * 100}%` }}>
                Hard
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Progress() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [streak, setStreak] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([listWorkoutLogs(user.id, 200), getStreak(user.id)]).then(([logsRes, streakRes]) => {
      if (!active) return
      setLogs(logsRes.data ?? [])
      setStreak(streakRes.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user])

  const stats = useMemo(() => summarize(logs), [logs])

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Progress</h1>
        <div className="h-20 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Progress</h1>

      {logs.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Your stats will show up here once you log a workout.
        </p>
      ) : (
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Total workouts" value={stats.totalWorkouts} />
          <StatCard label="Last 7 days" value={stats.last7} />
          <StatCard label="Last 30 days" value={stats.last30} />
          <StatCard label="Current streak" value={`${streak?.current_streak ?? 0} days`} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Advanced analytics</h2>
        <PremiumGate
          feature="Advanced analytics"
          description="Volume trends, top exercises, PRs, and effort breakdown."
        >
          <AdvancedAnalytics logs={logs} />
        </PremiumGate>
      </section>
    </div>
  )
}

export default Progress
