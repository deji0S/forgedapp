/**
 * The logo asset (public/forged-logo.png) is a solid white "FRG" monogram on a
 * transparent background, so it's only legible on the dark theme as-is. In light
 * mode we `invert` it to solid black; `dark:invert-0` restores the original
 * white for the dark theme. A single asset covers both themes this way.
 */
export function ForgedLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/forged-logo.png"
      alt="Forged"
      className={`w-auto shrink-0 self-start select-none invert dark:invert-0 ${className}`}
      draggable={false}
    />
  )
}

/**
 * Slim branded bar shown at the top of every in-app screen. Sticks to the top on
 * scroll and mirrors the BottomNav's translucent border/backdrop treatment.
 */
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-black/95">
      <ForgedLogo className="h-6" />
    </header>
  )
}
