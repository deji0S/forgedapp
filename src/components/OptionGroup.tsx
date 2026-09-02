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
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-neutral-800 text-neutral-300',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
