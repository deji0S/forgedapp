import type { WorkoutLog } from '../types/tracking'

// All of these are pure functions over the user's own workout_logs. The basic
// summary is free; weeklyVolume / topExercises / personalRecords /
// feedbackBreakdown power the premium "Advanced analytics" section.

function reps(log: WorkoutLog): number {
  return log.exercises.reduce((sum, ex) => sum + ex.sets * ex.reps, 0)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export interface AnalyticsSummary {
  totalWorkouts: number
  last7: number
  last30: number
  totalReps: number
}

export function summarize(logs: WorkoutLog[]): AnalyticsSummary {
  const since7 = daysAgo(7)
  const since30 = daysAgo(30)
  return {
    totalWorkouts: logs.length,
    last7: logs.filter((l) => l.logged_date >= since7).length,
    last30: logs.filter((l) => l.logged_date >= since30).length,
    totalReps: logs.reduce((sum, l) => sum + reps(l), 0),
  }
}

export interface WeekBucket {
  weekStart: string
  label: string
  workouts: number
  reps: number
}

/** Reps and workout counts bucketed by ISO week, most recent `weeks` weeks. */
export function weeklyVolume(logs: WorkoutLog[], weeks = 6): WeekBucket[] {
  const monday = new Date()
  monday.setUTCHours(0, 0, 0, 0)
  const dow = (monday.getUTCDay() + 6) % 7 // 0 = Monday
  monday.setUTCDate(monday.getUTCDate() - dow)

  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday)
    start.setUTCDate(monday.getUTCDate() - i * 7)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)
    const startIso = start.toISOString().slice(0, 10)
    const endIso = end.toISOString().slice(0, 10)
    const inWeek = logs.filter((l) => l.logged_date >= startIso && l.logged_date < endIso)
    buckets.push({
      weekStart: startIso,
      label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      workouts: inWeek.length,
      reps: inWeek.reduce((sum, l) => sum + reps(l), 0),
    })
  }
  return buckets
}

export interface ExerciseVolume {
  name: string
  sets: number
  reps: number
}

export function topExercises(logs: WorkoutLog[], limit = 5): ExerciseVolume[] {
  const byName = new Map<string, ExerciseVolume>()
  for (const log of logs) {
    for (const ex of log.exercises) {
      const key = ex.name.trim()
      if (!key) continue
      const current = byName.get(key) ?? { name: key, sets: 0, reps: 0 }
      current.sets += ex.sets
      current.reps += ex.sets * ex.reps
      byName.set(key, current)
    }
  }
  return [...byName.values()].sort((a, b) => b.reps - a.reps).slice(0, limit)
}

export interface PersonalRecord {
  name: string
  weightKg: number
}

/** Heaviest logged weight per exercise, for exercises that ever used weight. */
export function personalRecords(logs: WorkoutLog[], limit = 5): PersonalRecord[] {
  const best = new Map<string, number>()
  for (const log of logs) {
    for (const ex of log.exercises) {
      const key = ex.name.trim()
      if (!key || !ex.weight_kg) continue
      best.set(key, Math.max(best.get(key) ?? 0, ex.weight_kg))
    }
  }
  return [...best.entries()]
    .map(([name, weightKg]) => ({ name, weightKg }))
    .sort((a, b) => b.weightKg - a.weightKg)
    .slice(0, limit)
}

export function feedbackBreakdown(logs: WorkoutLog[]): { too_easy: number; just_right: number; too_hard: number } {
  const counts = { too_easy: 0, just_right: 0, too_hard: 0 }
  for (const log of logs) {
    if (log.feedback === 'too_easy' || log.feedback === 'just_right' || log.feedback === 'too_hard') {
      counts[log.feedback] += 1
    }
  }
  return counts
}
