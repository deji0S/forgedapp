import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import {
  createWorkoutPlan,
  deleteWorkoutPlan,
  listWorkoutPlans,
  setWorkoutPlanPosition,
  updateWorkoutPlan,
} from '../lib/tracking'
import WorkoutForm from '../components/WorkoutForm'
import type { WorkoutFormValues } from '../components/WorkoutForm'
import type { WorkoutPlan } from '../types/tracking'

function Workouts() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  useEffect(() => {
    if (!user) return
    listWorkoutPlans(user.id).then(({ data }) => {
      setPlans(data ?? [])
      setLoading(false)
    })
  }, [user])

  async function handleCreate(values: WorkoutFormValues) {
    if (!user) return 'You must be signed in.'
    const position = plans.length ? Math.max(...plans.map((p) => p.position)) + 1 : 0
    const { data, error } = await createWorkoutPlan(user.id, { ...values, position })
    if (error) return error.message
    if (data) setPlans((prev) => [...prev, data])
    setShowForm(false)
    return null
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (reordering || target < 0 || target >= plans.length) return

    const current = plans[index]
    const neighbour = plans[target]
    const previous = plans

    const next = [...plans]
    next[index] = { ...neighbour, position: current.position }
    next[target] = { ...current, position: neighbour.position }
    setPlans(next)
    setReordering(true)

    const results = await Promise.all([
      setWorkoutPlanPosition(current.id, neighbour.position),
      setWorkoutPlanPosition(neighbour.id, current.position),
    ])
    setReordering(false)

    if (results.some((r) => r.error)) setPlans(previous)
  }

  async function handleUpdate(planId: string, values: WorkoutFormValues) {
    const { data, error } = await updateWorkoutPlan(planId, values)
    if (error) return error.message
    if (data) setPlans((prev) => prev.map((p) => (p.id === planId ? data : p)))
    setEditingId(null)
    return null
  }

  async function handleDelete() {
    if (!deletingId) return
    setDeleteBusy(true)
    setDeleteError(null)
    const { error } = await deleteWorkoutPlan(deletingId)
    setDeleteBusy(false)
    if (error) {
      setDeleteError(error.message)
      return
    }
    setPlans((prev) => prev.filter((p) => p.id !== deletingId))
    setDeletingId(null)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Workouts</h1>
        <button
          type="button"
          onClick={() => {
            setEditingId(null)
            setShowForm((v) => !v)
          }}
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white active:opacity-80"
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showForm && (
        <WorkoutForm
          submitLabel="Save workout"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No workouts yet. Tap "+ New" to build your first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p, index) =>
            editingId === p.id ? (
              <li key={p.id}>
                <WorkoutForm
                  initialName={p.name}
                  initialExercises={p.exercises}
                  submitLabel="Save changes"
                  onSubmit={(values) => handleUpdate(p.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li key={p.id} className="flex items-stretch gap-2">
                <div className="flex w-8 shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || reordering}
                    aria-label={`Move ${p.name} up`}
                    className="flex flex-1 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 active:opacity-80 disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M6 15l6-6 6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === plans.length - 1 || reordering}
                    aria-label={`Move ${p.name} down`}
                    className="flex flex-1 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 active:opacity-80 disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <Link
                  to={`/workouts/${p.id}`}
                  className="block flex-1 rounded-2xl border border-neutral-800 p-4 active:opacity-80"
                >
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="mt-1 text-xs text-neutral-400">{p.exercises.length} exercises</p>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(p.id)
                  }}
                  aria-label={`Edit ${p.name}`}
                  className="flex w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 text-neutral-400 active:opacity-80"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null)
                    setDeletingId(p.id)
                  }}
                  aria-label={`Delete ${p.name}`}
                  className="flex w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 text-neutral-400 active:opacity-80"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {deletingId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-workout-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => !deleteBusy && setDeletingId(null)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-workout-title" className="text-sm font-medium text-white">
              Delete this workout? This can't be undone.
            </p>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={deleteBusy}
                className="flex-1 rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
              >
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Workouts
