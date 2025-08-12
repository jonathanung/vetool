"use client"
import clsx from 'clsx'
import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export default function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm transition-colors ease-smooth disabled:opacity-50',
        variant === 'primary' && 'bg-[var(--primary)] text-[var(--primary-contrast)] hover:shadow-glow',
        variant === 'ghost' && 'bg-transparent text-[var(--text)] hover:bg-[var(--card-glass)]',
        className,
      )}
    />
  )
} 