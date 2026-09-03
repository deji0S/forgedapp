import { useState } from 'react'
import type { FormEvent } from 'react'
import type { PlanExercise } from '../types/tracking'

const BLANK_EXERCISE: PlanExercise = { name: '', sets: 3, reps: 10 }

export interface WorkoutFormValues {
  name: string
  exercises: PlanExercise[]
}

interface WorkoutFormProps {
  initialName?: string
  initialExercises?: PlanExercise[]
  submitLabel: string
  onSubmit: (values: WorkoutFormValues) => Promise<string | null>
  onCancel?: () => void
}

function WorkoutForm({
  initialName = '',
  initialExercises,
  submitLabel,
  onSubmit,
  onCancel,
}: WorkoutFormProps) {
  const [name, setName] = useState(initialName)
  const [exercises, setExercises] = useState<PlanExercise[]>(
    initialExercises && initialExercises.length > 0
      ? initialExercises.map((ex) => ({ ...ex }))
      : [{ ...BLANK_EXERCISE }],
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateExercise(index: number, patch: Partial<PlanExercise>) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)))
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const cleanExercises = exercises
      .filter((ex) => ex.name.trim().length > 0)
      .map((ex) => ({ ...ex, name: ex.name.trim() }))
    if (!name.trim() || cleanExercises.length === 0) {
      setError('Add a name and at least one exercise.')
      return
    }

    setError(null)
    setSubmitting(true)
    const message = await onSubmit({ name: name.trim(), exercises: cleanExercises })
    setSubmitting(false)
    if (message) setError(message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-800 p-4">
      <input
        type="text"
        placeholder="Workout name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-white focus:outline-none"
      />

      <div className="space-y-2">
        {exercises.map((exercise, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Exercise"
              value={exercise.name}
              onChange={(e) => updateExercise(index, { name: e.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
            />
            <input
              type="number"
              min={1}
              aria-label="Sets"
              value={exercise.sets}
              onChange={(e) => updateExercise(index, { sets: Number(e.target.value) })}
              className="w-14 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-center text-sm text-white focus:border-white focus:outline-none"
            />
            <span className="text-xs text-neutral-500">×</span>
            <input
              type="number"
              min={1}
              aria-label="Reps"
              value={exercise.reps}
              onChange={(e) => updateExercise(index, { reps: Number(e.target.value) })}
              className="w-14 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-2 text-center text-sm text-white focus:border-white focus:outline-none"
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
        className="text-sm font-medium text-white"
      >
        + Add exercise
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-black active:opacity-80 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default WorkoutForm
