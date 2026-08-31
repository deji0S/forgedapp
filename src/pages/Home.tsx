import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { checkInToday, getStreak, getTodayCheckin, listWorkoutPlans } from '../lib/tracking'
import type { Streak, WorkoutPlan } from '../types/tracking'

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
        {checkedIn ? "Checked in for today" : checkingIn ? 'Checking in…' : 'Check in for today'}
      </button>
    </div>
  )
}

export default Home
