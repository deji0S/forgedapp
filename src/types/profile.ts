export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type Goal = 'lose_weight' | 'build_muscle' | 'improve_endurance' | 'general_fitness'
export type WorkoutTypePreference = 'home' | 'gym' | 'both'

export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  fitness_level: FitnessLevel
  goal: Goal
  workout_type: WorkoutTypePreference
  days_per_week: number
  created_at: string
  updated_at: string
}

export interface ProfileHandleInput {
  username: string
  display_name: string
}

export interface OnboardingInput {
  fitness_level: FitnessLevel
  goal: Goal
  workout_type: WorkoutTypePreference
  days_per_week: number
}
