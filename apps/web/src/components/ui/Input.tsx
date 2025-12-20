import React from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export default function Input({
  className,
  label,
  error,
  hint,
  id,
  ...props
}: InputProps) {
  const inputId = id || props.name

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        className={clsx(
          'bento-input',
          error && 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--danger-soft)]',
          className,
        )}
      />
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-text-muted">{hint}</p>
      )}
    </div>
  )
}
