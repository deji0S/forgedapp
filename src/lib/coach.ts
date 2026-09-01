import type { Profile } from '../types/profile'
import type { WorkoutLog } from '../types/tracking'

// The premium "AI coach": a deterministic, rule-based analysis of the user's
// recent training. It's a richer version of the free post-workout check-in in
// checkin.ts — it looks at consistency vs. their stated goal, week-over-week
// volume, and their feedback trend, and returns a few concrete talking points.
// No external calls.

export interface CoachPoint {
  label: string
  detail: string
}

export interface CoachReport {
  headline: string
  points: CoachPoint[]
  generatedFrom: number
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function totalReps(log: WorkoutLog): number {
  return log.exercises.reduce((sum, ex) => sum + ex.sets * ex.reps, 0)
}

const GOAL_LABEL: Record<Profile['goal'], string> = {
  lose_weight: 'losing weight',
  build_muscle: 'building muscle',
  improve_endurance: 'improving endurance',
  general_fitness: 'general fitness',
}

export function buildCoachReport(logs: WorkoutLog[], profile: Profile | null): CoachReport {
  if (logs.length === 0) {
    return {
      headline: 'Log a couple of workouts and your coach will have something to work with.',
      points: [
        {
          label: 'Getting started',
          detail:
            'Once you have a week or two of history, this turns into specific feedback on consistency, volume, and how hard your sessions feel.',
        },
      ],
      generatedFrom: 0,
    }
  }

  const points: CoachPoint[] = []

  // --- Consistency vs. the plan --------------------------------------------
  const since7 = isoDaysAgo(7)
  const since14 = isoDaysAgo(14)
  const last7 = new Set(logs.filter((l) => l.logged_date >= since7).map((l) => l.logged_date)).size
  const prev7 = new Set(
    logs.filter((l) => l.logged_date >= since14 && l.logged_date < since7).map((l) => l.logged_date),
  ).size
  const target = profile?.days_per_week ?? 3

  if (last7 >= target) {
    points.push({
      label: 'Consistency',
      detail: `${last7} session${last7 === 1 ? '' : 's'} in the last 7 days — you're hitting your ${target}/week target. Hold this line; it's the biggest lever you have.`,
    })
  } else if (last7 === 0) {
    points.push({
      label: 'Consistency',
      detail: `No sessions logged in the last 7 days. Get one on the board this week, even a short one — restarting is harder the longer the gap.`,
    })
  } else {
    points.push({
      label: 'Consistency',
      detail: `${last7}/${target} planned sessions this week${prev7 > last7 ? ` (down from ${prev7} the week before)` : ''}. One more session gets you back on plan.`,
    })
  }

  // --- Volume trend ------------------------------------------------------
  const repsLast7 = logs
    .filter((l) => l.logged_date >= since7)
    .reduce((sum, l) => sum + totalReps(l), 0)
  const repsPrev7 = logs
    .filter((l) => l.logged_date >= since14 && l.logged_date < since7)
    .reduce((sum, l) => sum + totalReps(l), 0)

  if (repsPrev7 > 0) {
    const change = Math.round(((repsLast7 - repsPrev7) / repsPrev7) * 100)
    if (change >= 25) {
      points.push({
        label: 'Volume',
        detail: `Total reps jumped ~${change}% week over week. That's a big spike — fine occasionally, but keep an eye on recovery and don't repeat it next week.`,
      })
    } else if (change <= -25) {
      points.push({
        label: 'Volume',
        detail: `Total reps dropped ~${Math.abs(change)}% versus last week. If that wasn't a planned deload, aim to at least match last week's work.`,
      })
    } else {
      points.push({
        label: 'Volume',
        detail: `Training volume is roughly steady week over week (${change >= 0 ? '+' : ''}${change}%). Steady is good — add a little each week rather than in jumps.`,
      })
    }
  }

  // --- Feedback trend --------------------------------------------------
  const recentFeedback = logs
    .slice(0, 5)
    .map((l) => l.feedback)
    .filter((f): f is 'too_easy' | 'just_right' | 'too_hard' => f != null)

  if (recentFeedback.length >= 2) {
    const tally = { too_easy: 0, just_right: 0, too_hard: 0 }
    for (const f of recentFeedback) tally[f] += 1
    const top = (Object.keys(tally) as (keyof typeof tally)[]).reduce((a, b) =>
      tally[a] >= tally[b] ? a : b,
    )
    if (top === 'too_easy') {
      points.push({
        label: 'Difficulty',
        detail:
          'Your recent sessions have felt easy. Add load or a couple of reps on your main lifts next time — progressive overload is what drives change.',
      })
    } else if (top === 'too_hard') {
      points.push({
        label: 'Difficulty',
        detail:
          "Recent sessions have felt hard. Pull the weight back ~10% or trim a set for a week so you're training, not just surviving.",
      })
    } else {
      points.push({
        label: 'Difficulty',
        detail:
          "Sessions are landing in the 'just right' zone. Nudge one variable up slightly each week and keep logging how it feels.",
      })
    }
  }

  // --- Goal-specific nudge ------------------------------------------------
  if (profile) {
    const goalTips: Record<Profile['goal'], string> = {
      lose_weight:
        'For weight loss, training keeps muscle while the deficit does the work — prioritise showing up over chasing PRs, and keep protein high.',
      build_muscle:
        'For muscle, aim for most working sets to end 1-3 reps shy of failure and beat your last logged numbers over time.',
      improve_endurance:
        'For endurance, gradually extend time under tension or shorten rest rather than piling on weight.',
      general_fitness:
        'For general fitness, variety plus consistency wins — mix in different movements but keep the weekly session count stable.',
    }
    points.push({
      label: 'Your goal',
      detail: `You're training for ${GOAL_LABEL[profile.goal]}. ${goalTips[profile.goal]}`,
    })
  }

  const headline =
    last7 >= target
      ? "You're on plan — here's how to make the work count."
      : last7 === 0
        ? "Let's get you back to training this week."
        : "You're close to on-plan. A few adjustments:"

  return { headline, points, generatedFrom: logs.length }
}
