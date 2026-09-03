import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'w-full rounded-xl py-3 text-sm font-semibold active:opacity-80',
        variant === 'primary' && 'bg-white text-black',
        variant === 'secondary' && 'bg-neutral-800 text-white',
        className,
      )}
      {...props}
    />
  )
}

export default Button
