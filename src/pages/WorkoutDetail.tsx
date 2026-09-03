import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cn } from '../lib/utils'
import { useAuth } from '../lib/auth-context'
import { createWorkoutCheckin } from '../lib/checkin'
import { getWorkoutPlan, logWorkout, setWorkoutFeedback } from '../lib/tracking'
import type { WorkoutFeedback, WorkoutInsight, WorkoutPlan } from '../types/tracking'

const FEEDBACK_OPTIONS: { value: WorkoutFeedback; label: string }[] = [
  { value: 'too_easy', label: 'Too easy' },
  { value: 'just_right', label: 'Just right' },
  { value: 'too_hard', label: 'Too hard' },
]

function WorkoutDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [loggedWorkoutId, setLoggedWorkoutId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [insight, setInsight] = useState<WorkoutInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  const [feedback, setFeedback] = useState<WorkoutFeedback | null>(null)

  useEffect(() => {
    if (!id) return
    getWorkoutPlan(id).then(({ data }) => {
      setPlan(data)
      setLoading(false)
    })
  }, [id])

  async function handleComplete() {
    if (!user || !plan) return
    setCompleting(true)
    setError(null)
    const { data, error: logError } = await logWorkout(user.id, {
      name: plan.name,
      plan_id: plan.id,
      exercises: plan.exercises,
    })
    setCompleting(false)

    if (logError || !data) {
      setError(logError?.message ?? 'Something went wrong.')
      return
    }

    setLoggedWorkoutId(data.id)

    setInsightLoading(true)
    const { data: insightData } = await createWorkoutCheckin(user.id, data.id, plan.name)
    setInsight(insightData ?? null)
    setInsightLoading(false)
  }

  async function handleFeedback(value: WorkoutFeedback) {
    if (!loggedWorkoutId) return
    setFeedback(value)
    await setWorkoutFeedback(loggedWorkoutId, value)
  }

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-neutral-400">Loading…</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-neutral-400">Workout not found.</p>
        <Link to="/workouts" className="text-sm font-medium text-white">
          Back to workouts
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <Link to="/workouts" className="text-sm font-medium text-neutral-400">
          ← Workouts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{plan.name}</h1>
        <p className="mt-1 text-sm text-neutral-400">{plan.exercises.length} exercises</p>
      </div>

      <ul className="space-y-3">
        {plan.exercises.map((exercise, index) => (
          <li
            key={index}
            className="flex items-center justify-between rounded-2xl border border-neutral-800 p-4"
          >
            <span className="font-medium text-white">{exercise.name}</span>
            <span className="text-sm text-neutral-400">
              {exercise.sets} × {exercise.reps}
              {exercise.weight_kg ? ` @ ${exercise.weight_kg}kg` : ''}
            </span>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loggedWorkoutId ? (
        <div className="space-y-4 rounded-2xl border border-green-500 bg-green-500/10 p-4">
          <p className="text-center text-sm font-semibold text-green-400">Workout logged 🎉</p>

          {insightLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-3/5 animate-pulse rounded bg-white/10" />
            </div>
          ) : insight ? (
            <div className="space-y-2 border-t border-green-500/30 pt-3">
              <p className="text-sm text-white">{insight.message}</p>
              <p className="text-xs text-green-300">
                <span className="font-semibold">Next time: </span>
                {insight.suggestion}
              </p>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-green-500/30 pt-3">
            <p className="text-xs text-neutral-300">How did it feel?</p>
            <div className="flex gap-2">
              {FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFeedback(option.value)}
                  className={cn(
                    'flex-1 rounded-lg border px-2 py-2 text-xs font-medium',
                    feedback === option.value
                      ? 'border-green-400 bg-green-500 text-white'
                      : 'border-neutral-700 text-neutral-300',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/"
            className="block w-full rounded-xl bg-green-500 py-3 text-center text-sm font-semibold text-white active:opacity-80"
          >
            Back to home
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black active:opacity-80 disabled:opacity-60"
        >
          {completing ? 'Logging…' : 'Complete workout'}
        </button>
      )}
    </div>
  )
}

export default WorkoutDetail
