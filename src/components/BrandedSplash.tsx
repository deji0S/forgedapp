import { ForgedLogo } from './AppHeader'

/**
 * Shown while the auth/session check is in flight (initial load, and the
 * brief window after sign-in while the profile loads). No artificial
 * minimum delay -- it's on screen for exactly as long as that check takes.
 */
export function BrandedSplash() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-white dark:bg-black">
      <ForgedLogo className="h-14 splash-pulse" />
    </div>
  )
}
