import { supabase } from './supabase'
import type { WorkoutFeedback, WorkoutInsight } from '../types/tracking'

type Trend = WorkoutFeedback | 'neutral'

const CHECKIN_MESSAGES = [
  'Nice work finishing {workout}! 💪',
  "{workout} complete — that's another one in the books.",
  'Great job! Consistency like this adds up fast.',
  'You showed up and got it done. That’s what counts.',
  '{workout} logged. Your future self says thanks.',
  'Solid session! Recovery matters just as much as the work.',
  'Another rep, another step forward. Well done.',
  "That's a wrap on {workout} — proud of the effort.",
]

const SUGGESTIONS: Record<Trend, string[]> = {
  too_easy: [
    "You've said your last few workouts felt easy — try adding a bit more weight or a couple extra reps next time.",
    "Sounds like you're ready for more of a challenge. Bump up the intensity on your next session.",
    'Since things have felt light lately, consider adding an extra set to your main lifts next time.',
  ],
  too_hard: [
    'A few recent workouts felt tough — it might be worth easing back the weight or reps next time.',
    'Listen to your body: consider a lighter session or an extra rest day before your next workout.',
    "If you're feeling run down, dialing back intensity next time can help you recover and come back stronger.",
  ],
  just_right: [
    "Things have felt just right lately — keep the intensity steady and stay consistent.",
    "You're finding a good rhythm. Small, steady progress from here will keep it sustainable.",
    'Keep this pace up — consider a small increase in weight or reps once it starts to feel easy.',
  ],
  neutral: [
    'As you log more workouts and share feedback, suggestions here will start adapting to you.',
    'Try leaving feedback after each workout — it helps tailor future suggestions to how you feel.',
    'Keep it up! Once there’s a feedback trend, this tip will adjust to match your progress.',
  ],
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function determineTrend(recentFeedback: (WorkoutFeedback | null)[]): Trend {
  const counts: Record<WorkoutFeedback, number> = { too_easy: 0, too_hard: 0, just_right: 0 }
  for (const feedback of recentFeedback) {
    if (feedback) counts[feedback] += 1
  }

  const [topFeedback, topCount] = (Object.entries(counts) as [WorkoutFeedback, number][]).reduce(
    (max, entry) => (entry[1] > max[1] ? entry : max),
  )

  return topCount > 0 ? topFeedback : 'neutral'
}

// "Adapts future workout suggestions based on the user's feedback": looks at
// the feedback left on recent workouts (too_easy / just_right / too_hard) and
// picks a suggestion from the matching pool, alongside a random check-in
// message. No external calls — everything here is pre-written and free.
export async function createWorkoutCheckin(userId: string, workoutLogId: string, workoutName: string) {
  const { data: recentLogs } = await supabase
    .from('workout_logs')
    .select('feedback')
    .eq('user_id', userId)
    .neq('id', workoutLogId)
    .order('logged_date', { ascending: false })
    .limit(5)

  const trend = determineTrend((recentLogs ?? []).map((log) => log.feedback as WorkoutFeedback | null))

  const message = pickRandom(CHECKIN_MESSAGES).replace('{workout}', workoutName)
  const suggestion = pickRandom(SUGGESTIONS[trend])

  return supabase
    .from('workout_insights')
    .upsert(
      { user_id: userId, workout_log_id: workoutLogId, message, suggestion },
      { onConflict: 'workout_log_id' },
    )
    .select()
    .single<WorkoutInsight>()
}
