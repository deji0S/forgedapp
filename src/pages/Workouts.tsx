import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { createWorkoutPlan, listWorkoutPlans } from '../lib/tracking'
import type { PlanExercise, WorkoutPlan } from '../types/tracking'

const BLANK_EXERCISE: PlanExercise = { name: '', sets: 3, reps: 10 }

function Workouts() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<PlanExercise[]>([{ ...BLANK_EXERCISE }])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    listWorkoutPlans(user.id).then(({ data }) => {
      setPlans(data ?? [])
      setLoading(false)
    })
  }, [user])

  function updateExercise(index: number, patch: Partial<PlanExercise>) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)))
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return

    const cleanExercises = exercises.filter((ex) => ex.name.trim().length > 0)
    if (!name.trim() || cleanExercises.length === 0) {
      setError('Add a name and at least one exercise.')
      return
    }

    setError(null)
    setSubmitting(true)
    const { data, error: insertError } = await createWorkoutPlan(user.id, {
      name: name.trim(),
      exercises: cleanExercises,
    })
    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    if (data) setPlans((prev) => [data, ...prev])
    setName('')
    setExercises([{ ...BLANK_EXERCISE }])
    setShowForm(false)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Workouts</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white active:opacity-80"
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-800 p-4">
          <input
            type="text"
            placeholder="Workout name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-brand-500 focus:outline-none"
          />

          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Exercise"
                  value={exercise.name}
                  onChange={(e) => updateExercise(index, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="number"
                  min={1}
                  aria-label="Sets"
                  value={exercise.sets}
                  onChange={(e) => updateExercise(index, { sets: Number(e.target.value) })}
                  className="w-14 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
                />
                <span className="text-xs text-neutral-500">×</span>
                <input
                  type="number"
                  min={1}
                  aria-label="Reps"
                  value={exercise.reps}
                  onChange={(e) => updateExercise(index, { reps: Number(e.target.value) })}
                  className="w-14 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-center text-sm text-white focus:border-brand-500 focus:outline-none"
                />
                {exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExercise(index)}
                    className="px-1 text-neutral-500 active:opacity-80"
                    aria-label="Remove exercise"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setExercises((prev) => [...prev, { ...BLANK_EXERCISE }])}
            className="text-sm font-medium text-brand-400"
          >
            + Add exercise
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save workout'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No workouts yet. Tap "+ New" to build your first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li key={p.id}>
              <Link
                to={`/workouts/${p.id}`}
                className="block rounded-2xl border border-neutral-800 p-4 active:opacity-80"
              >
                <p className="font-medium text-white">{p.name}</p>
                <p className="mt-1 text-xs text-neutral-400">{p.exercises.length} exercises</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Workouts
