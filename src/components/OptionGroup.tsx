import { cn } from '../lib/utils'

export default function OptionGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-xl border px-4 py-2 text-sm font-medium',
            value === option.value
              ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
