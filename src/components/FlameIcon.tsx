/**
 * Small flame mark. Monochrome — renders in `currentColor` so it inherits
 * the surrounding text color (black on light, white on dark) rather than
 * introducing a new accent.
 *
 * The animated flicker+glow (see index.css) is kept exclusive to the
 * streak hero (components/StreakHero.tsx) so it stays a distinctive,
 * "earned" moment rather than a motif sprinkled everywhere it appears —
 * pass `animated={false}` (the default elsewhere, e.g. Home's stat row)
 * for a plain static icon.
 */
export function FlameIcon({
  className = 'h-8 w-8',
  animated = false,
}: {
  className?: string
  animated?: boolean
}) {
  return (
    <span className={`relative inline-block ${className}`}>
      {animated && (
        <span aria-hidden className="flame-glow absolute inset-0 rounded-full bg-current blur-md" />
      )}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
        className={`relative h-full w-full ${animated ? 'flame-flicker' : ''}`}
      >
        <path d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1.005a5.981 5.981 0 0 1 1.485-3.708 3.75 3.75 0 0 1 3.695 3.875Z" />
      </svg>
    </span>
  )
}
