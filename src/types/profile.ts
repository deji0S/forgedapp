export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type Goal = 'lose_weight' | 'build_muscle' | 'improve_endurance' | 'general_fitness'
export type WorkoutTypePreference = 'home' | 'gym' | 'both'

export interface Profile {
  id: string
  fitness_level: FitnessLevel
  goal: Goal
  workout_type: WorkoutTypePreference
  days_per_week: number
  created_at: string
  updated_at: string
}

export interface OnboardingInput {
  fitness_level: FitnessLevel
  goal: Goal
  workout_type: WorkoutTypePreference
  days_per_week: number
}
