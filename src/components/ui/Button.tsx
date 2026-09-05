import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'w-full rounded-xl py-3 text-sm font-semibold pressable',
        variant === 'primary' && 'bg-black dark:bg-white text-white dark:text-black',
        variant === 'secondary' && 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white',
        className,
      )}
      {...props}
    />
  )
}

export default Button
