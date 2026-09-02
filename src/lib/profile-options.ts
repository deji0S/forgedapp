import type { FitnessLevel, Goal, WorkoutTypePreference } from '../types/profile'

export const FITNESS_LEVELS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'improve_endurance', label: 'Improve endurance' },
  { value: 'general_fitness', label: 'General fitness' },
]

export const WORKOUT_TYPES: { value: WorkoutTypePreference; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'gym', label: 'Gym' },
  { value: 'both', label: 'Both' },
]

export const DAYS_PER_WEEK = [1, 2, 3, 4, 5, 6, 7]
