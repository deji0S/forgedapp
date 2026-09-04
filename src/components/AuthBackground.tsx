/**
 * Subtle, slow-moving decorative background for the auth screen (sign in /
 * sign up). Pure CSS — transform-only keyframes, no JS/canvas/timers — so it
 * stays cheap on battery and doesn't cause layout/paint thrash on mobile.
 * `prefers-reduced-motion` disables the animation (see index.css).
 *
 * Absolutely positioned behind the form content (`-z-10`) with
 * `pointer-events-none`, so it never intercepts taps on the email/password
 * fields regardless of stacking.
 */
export function AuthBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="auth-bg-blob-a absolute -left-1/4 -top-1/4 h-[70vmax] w-[70vmax] rounded-full bg-neutral-400/15 blur-3xl dark:bg-white/[0.06]" />
      <div className="auth-bg-blob-b absolute -right-1/4 -bottom-1/4 h-[70vmax] w-[70vmax] rounded-full bg-neutral-400/15 blur-3xl dark:bg-white/[0.06]" />
      <div className="auth-bg-grid absolute -inset-[10%] text-neutral-500/[0.08] dark:text-white/[0.06]" />
    </div>
  )
}
