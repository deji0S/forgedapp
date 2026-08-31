import type { WorkoutTypePreference } from './profile'

export interface PlanExercise {
  name: string
  sets: number
  reps: number
  weight_kg?: number
}

export interface WorkoutPlan {
  id: string
  user_id: string
  name: string
  workout_type: WorkoutTypePreference | null
  exercises: PlanExercise[]
  created_at: string
  updated_at: string
}

export interface WorkoutLog {
  id: string
  user_id: string
  plan_id: string | null
  name: string
  logged_date: string
  exercises: PlanExercise[]
  feedback: string | null
  created_at: string
}

export type WorkoutFeedback = 'too_easy' | 'just_right' | 'too_hard'

export interface WorkoutInsight {
  id: string
  user_id: string
  workout_log_id: string
  message: string
  suggestion: string
  created_at: string
}

export interface Streak {
  user_id: string
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  updated_at: string
}

export interface HabitCheckin {
  id: string
  user_id: string
  checkin_date: string
  note: string | null
  created_at: string
}
