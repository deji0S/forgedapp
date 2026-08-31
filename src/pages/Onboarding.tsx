import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { useAuth } from '../lib/auth-context'
import type { FitnessLevel, Goal, WorkoutTypePreference } from '../types/profile'

const FITNESS_LEVELS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'improve_endurance', label: 'Improve endurance' },
  { value: 'general_fitness', label: 'General fitness' },
]

const WORKOUT_TYPES: { value: WorkoutTypePreference; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'gym', label: 'Gym' },
  { value: 'both', label: 'Both' },
]

const DAYS_PER_WEEK = [1, 2, 3, 4, 5, 6, 7]

function OptionGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-xl border px-4 py-2 text-sm font-medium',
            value === option.value
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-neutral-800 text-neutral-300',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Onboarding() {
  const { session, profile, loading, completeOnboarding } = useAuth()
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [workoutType, setWorkoutType] = useState<WorkoutTypePreference | null>(null)
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (!session) return <Navigate to="/auth" replace />
  if (profile) return <Navigate to="/" replace />

  const isComplete = fitnessLevel && goal && workoutType && daysPerWeek

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!fitnessLevel || !goal || !workoutType || !daysPerWeek) return

    setError(null)
    setSubmitting(true)
    const message = await completeOnboarding({
      fitness_level: fitnessLevel,
      goal,
      workout_type: workoutType,
      days_per_week: daysPerWeek,
    })
    setSubmitting(false)
    if (message) setError(message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Let's set you up</h1>
        <p className="mt-1 text-sm text-neutral-400">
          A few quick questions to personalize your training.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Fitness level</h2>
        <OptionGroup options={FITNESS_LEVELS} value={fitnessLevel} onChange={setFitnessLevel} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Goal</h2>
        <OptionGroup options={GOALS} value={goal} onChange={setGoal} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Workout type</h2>
        <OptionGroup options={WORKOUT_TYPES} value={workoutType} onChange={setWorkoutType} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Days per week</h2>
        <OptionGroup
          options={DAYS_PER_WEEK.map((day) => ({ value: String(day), label: String(day) }))}
          value={daysPerWeek ? String(daysPerWeek) : null}
          onChange={(value) => setDaysPerWeek(Number(value))}
        />
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!isComplete || submitting}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white active:opacity-80 disabled:opacity-40"
      >
        {submitting ? 'Saving…' : 'Finish setup'}
      </button>
    </form>
  )
}

export default Onboarding
