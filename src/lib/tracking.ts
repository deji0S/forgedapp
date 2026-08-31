import { supabase } from './supabase'
import type {
  HabitCheckin,
  PlanExercise,
  Streak,
  WorkoutFeedback,
  WorkoutLog,
  WorkoutPlan,
} from '../types/tracking'
import type { WorkoutTypePreference } from '../types/profile'

export async function listWorkoutPlans(userId: string) {
  return supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<WorkoutPlan[]>()
}

export async function createWorkoutPlan(
  userId: string,
  input: { name: string; workout_type?: WorkoutTypePreference; exercises: PlanExercise[] },
) {
  return supabase
    .from('workout_plans')
    .insert({ user_id: userId, ...input })
    .select()
    .single<WorkoutPlan>()
}

export async function getWorkoutPlan(planId: string) {
  return supabase.from('workout_plans').select('*').eq('id', planId).maybeSingle<WorkoutPlan>()
}

export async function deleteWorkoutPlan(planId: string) {
  return supabase.from('workout_plans').delete().eq('id', planId)
}

export async function listWorkoutLogs(userId: string, limit = 30) {
  return supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_date', { ascending: false })
    .limit(limit)
    .returns<WorkoutLog[]>()
}

// Completing a workout is just inserting a log row for that day — the
// current_streak / longest_streak / last_activity_date in `streaks` are
// then recomputed by the workout_logs_streak trigger in the database.
export async function logWorkout(
  userId: string,
  input: { name: string; plan_id?: string | null; exercises: PlanExercise[]; logged_date?: string },
) {
  return supabase
    .from('workout_logs')
    .insert({ user_id: userId, ...input })
    .select()
    .single<WorkoutLog>()
}

export async function deleteWorkoutLog(logId: string) {
  return supabase.from('workout_logs').delete().eq('id', logId)
}

export async function setWorkoutFeedback(logId: string, feedback: WorkoutFeedback) {
  return supabase.from('workout_logs').update({ feedback }).eq('id', logId).select().single<WorkoutLog>()
}

export async function getStreak(userId: string) {
  return supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle<Streak>()
}

export async function listHabitCheckins(userId: string, limit = 30) {
  return supabase
    .from('habit_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })
    .limit(limit)
    .returns<HabitCheckin[]>()
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export async function getTodayCheckin(userId: string) {
  return supabase
    .from('habit_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('checkin_date', todayIsoDate())
    .maybeSingle<HabitCheckin>()
}

export async function checkInToday(userId: string, note?: string) {
  return supabase
    .from('habit_checkins')
    .upsert({ user_id: userId, checkin_date: todayIsoDate(), note }, { onConflict: 'user_id,checkin_date' })
    .select()
    .single<HabitCheckin>()
}
