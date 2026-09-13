import { useState } from 'react'
import { saveSharedWorkout } from '../lib/tracking'
import type { SharedWorkout } from '../types/social'

export function SharedWorkoutDetailModal({
  workout,
  currentUserId,
  canSave,
  onClose,
}: {
  workout: SharedWorkout
  currentUserId: string
  canSave: boolean
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error: saveError } = await saveSharedWorkout(currentUserId, workout)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setSaved(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-workout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            id="shared-workout-title"
            className="min-w-0 truncate text-base font-semibold text-neutral-900 dark:text-white"
          >
            🏋️ {workout.name}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-neutral-600 dark:text-neutral-400 pressable"
          >
            ✕
          </button>
        </div>

        {workout.exercises.length > 0 ? (
          <ul className="space-y-2">
            {workout.exercises.map((ex, i) => (
              <li key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                <p className="font-medium text-neutral-900 dark:text-white">{ex.name}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {ex.sets} sets × {ex.reps} reps
                  {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No exercises</p>
        )}

        {canSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="w-full rounded-xl bg-black dark:bg-white py-3 text-sm font-semibold text-white dark:text-black pressable disabled:opacity-60"
          >
            {saved ? 'Added to My Workouts ✓' : saving ? 'Adding…' : 'Add to My Workouts'}
          </button>
        )}

        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}
