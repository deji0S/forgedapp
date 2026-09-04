/**
 * Subtle, slow-moving decorative background for the auth screen (sign in /
 * sign up). Pure CSS — transform-only keyframes, no JS/canvas/timers — so it
 * stays cheap on battery and doesn't cause layout/paint thrash on mobile.
 * `prefers-reduced-motion` disables the animation (see index.css).
 *
 * Sized relative to the auth column itself (the app shell is a max-w-md
 * column, not the full viewport) so the blobs read as soft shapes rather
 * than the flat middle slice of something far larger than the screen.
 *
 * Absolutely positioned and painted before the form content in the DOM, so
 * it sits behind it without needing a z-index — deliberately NOT a negative
 * z-index: combined with a plain (non-stacking-context) `overflow-hidden`
 * ancestor, a negative z-index here hits a Chromium clipping bug that
 * shrinks the whole layer down to a sliver. `pointer-events-none` keeps it
 * from ever intercepting taps on the email/password fields regardless.
 */
export function AuthBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-bg-dots absolute -inset-6 text-neutral-900/[0.22] dark:text-white/[0.20]" />
      <div className="auth-bg-blob-a absolute -left-16 -top-20 h-64 w-64 rounded-full bg-neutral-900/[0.14] blur-xl dark:bg-white/[0.20]" />
      <div className="auth-bg-blob-b absolute -right-20 -bottom-16 h-72 w-72 rounded-full bg-neutral-900/[0.12] blur-xl dark:bg-white/[0.16]" />
    </div>
  )
}
