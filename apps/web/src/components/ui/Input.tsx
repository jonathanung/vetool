import React from 'react'
import clsx from 'clsx'

type Props = React.InputHTMLAttributes<HTMLInputElement>

export default function Input({ className, ...props }: Props) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-xl border px-3 py-2 text-sm bg-transparent',
        'border-[var(--muted)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:shadow-glow',
        className,
      )}
    />
  )
} 