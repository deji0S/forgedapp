import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { PremiumGate } from '../components/PremiumGate'
import { checkInToday, getStreak, getTodayCheckin, listWorkoutPlans } from '../lib/tracking'
import { recoverStreak, recoveryEligibility } from '../lib/streak'
import type { Streak, WorkoutPlan } from '../types/tracking'

function StreakRecoveryCard({
  streak,
  onRecovered,
}: {
  streak: Streak
  onRecovered: (next: Streak) => void
}) {
  const eligibility = useMemo(() => recoveryEligibility(streak), [streak])
  const [recovering, setRecovering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!eligibility.eligible) return null

  async function handleRecover() {
    setRecovering(true)
    setError(null)
    const { data, error: rpcError } = await recoverStreak()
    setRecovering(false)
    if (rpcError || !data) {
      setError(rpcError?.message ?? 'Could not recover your streak.')
      return
    }
    onRecovered(data)
  }

  return (
    <section className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div>
        <p className="text-sm font-semibold text-white">Streak at risk</p>
        <p className="mt-1 text-xs text-neutral-300">
          You missed {eligibility.missedDays} day{eligibility.missedDays === 1 ? '' : 's'}. Recover
          now to keep your {streak.longest_streak}-day best intact.
        </p>
      </div>
      <PremiumGate
        feature="Streak recovery"
        description="Restore a lapsed streak once every 30 days."
      >
        <button
          type="button"
          onClick={handleRecover}
          disabled={recovering}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-black active:opacity-80 disabled:opacity-60"
        >
          {recovering ? 'Recovering…' : 'Recover my streak'}
        </button>
      </PremiumGate>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  )
}

function Home() {
  const { user } = useAuth()
  const [streak, setStreak] = useState<Streak | null>(null)
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true

    Promise.all([getStreak(user.id), listWorkoutPlans(user.id), getTodayCheckin(user.id)]).then(
      ([streakRes, plansRes, checkinRes]) => {
        if (!active) return
        setStreak(streakRes.data)
        setPlan(plansRes.data?.[0] ?? null)
        setCheckedIn(Boolean(checkinRes.data))
        setLoading(false)
      },
    )

    return () => {
      active = false
    }
  }, [user])

  async function handleCheckIn() {
    if (!user || checkedIn) return
    setCheckingIn(true)
    const { error } = await checkInToday(user.id)
    setCheckingIn(false)
    if (!error) setCheckedIn(true)
  }

  const currentStreak = streak?.current_streak ?? 0
  const longestStreak = streak?.longest_streak ?? 0

  return (
    <div className="space-y-6 p-4">
      <header>
        <p className="text-sm text-neutral-400">Welcome back</p>
        <h1 className="text-2xl font-semibold text-white">Let's train</h1>
      </header>

      <section className="rounded-2xl bg-brand-500 p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-brand-100">Today's workout</p>
        {loading ? (
          <div className="mt-1 h-7 w-2/3 animate-pulse rounded bg-white/20" />
        ) : plan ? (
          <>
            <h2 className="mt-1 text-xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-sm text-brand-100">{plan.exercises.length} exercises</p>
            <Link
              to={`/workouts/${plan.id}`}
              className="mt-4 block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-brand-600 active:opacity-80"
            >
              Start workout
            </Link>
          </>
        ) : (
          <>
            <h2 className="mt-1 text-xl font-semibold">No workout planned</h2>
            <p className="mt-1 text-sm text-brand-100">Create a workout to get started.</p>
            <Link
              to="/workouts"
              className="mt-4 block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-brand-600 active:opacity-80"
            >
              Create workout
            </Link>
          </>
        )}
      </section>

      {streak && <StreakRecoveryCard streak={streak} onRecovered={setStreak} />}

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Current streak</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Longest streak</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={handleCheckIn}
        disabled={checkedIn || checkingIn}
        className={`w-full rounded-xl py-3 text-sm font-semibold active:opacity-80 disabled:active:opacity-100 ${
          checkedIn ? 'bg-brand-500/20 text-brand-400' : 'bg-brand-500 text-white'
        }`}
      >
        {checkedIn ? 'Checked in for today' : checkingIn ? 'Checking in…' : 'Check in for today'}
      </button>

      <Link
        to="/coach"
        className="flex items-center justify-between rounded-2xl border border-neutral-800 p-4 active:opacity-80"
      >
        <span>
          <span className="block text-sm font-semibold text-white">Your coach</span>
          <span className="block text-xs text-neutral-400">Personalized guidance from your training</span>
        </span>
        <span className="text-neutral-500">→</span>
      </Link>
    </div>
  )
}

export default Home
