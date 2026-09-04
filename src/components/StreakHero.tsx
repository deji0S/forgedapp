import { FlameIcon } from './FlameIcon'
import type { Streak } from '../types/tracking'

/**
 * Hero-style streak display — a prominent centerpiece rather than a small
 * stat row. Shared between the signed-in user's own Profile page and other
 * users' public profiles, so streaks read identically everywhere.
 */
export function StreakHero({ streak }: { streak: Streak | null }) {
  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0

  return (
    <div className="flex flex-col items-center gap-1 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 py-8 text-center">
      <div className="flex items-center gap-3">
        <FlameIcon className="h-11 w-11 text-neutral-900 dark:text-white" />
        <span className="text-6xl font-bold tabular-nums leading-none text-neutral-900 dark:text-white">
          {current}
        </span>
      </div>
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Day streak</p>
      {longest > current && (
        <p className="mt-1 text-xs text-neutral-500">
          Best: {longest} {longest === 1 ? 'day' : 'days'}
        </p>
      )}
    </div>
  )
}
