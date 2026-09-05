/**
 * Inline `animationDelay` for the `.stagger-item` entrance (see index.css)
 * so list rows cascade in rather than popping in at once. Clamps how many
 * items actually get an incremental delay so a long list doesn't take
 * seconds to finish revealing -- items past `max` all animate together.
 */
export function staggerDelay(index: number, stepMs = 30, max = 8) {
  return { animationDelay: `${Math.min(index, max) * stepMs}ms` }
}
