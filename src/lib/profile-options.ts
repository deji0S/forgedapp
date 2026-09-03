import type { FitnessLevel, Goal, Profile, WorkoutTypePreference } from '../types/profile'

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

export const GOAL_LABELS: Record<Profile['goal'], string> = {
  lose_weight: 'Lose weight',
  build_muscle: 'Build muscle',
  improve_endurance: 'Improve endurance',
  general_fitness: 'General fitness',
}

export const WORKOUT_TYPE_LABELS: Record<Profile['workout_type'], string> = {
  home: 'Home',
  gym: 'Gym',
  both: 'Home and gym',
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function profileDetails(
  profile: Pick<Profile, 'fitness_level' | 'goal' | 'workout_type' | 'days_per_week'>,
): { label: string; value: string }[] {
  const days = profile.days_per_week
  return [
    { label: 'Fitness level', value: capitalize(profile.fitness_level) },
    { label: 'Goal', value: GOAL_LABELS[profile.goal] },
    { label: 'Workout location', value: WORKOUT_TYPE_LABELS[profile.workout_type] },
    { label: 'Training days', value: `${days} ${days === 1 ? 'day' : 'days'} a week` },
  ]
}
