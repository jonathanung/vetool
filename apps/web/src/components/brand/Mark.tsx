import clsx from 'clsx'

export function Mark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={clsx('shrink-0', className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" fill="currentColor" className="text-bg-secondary" />
      <path d="M6 6h7.2L16 20.4V27L6 6z" fill="var(--team-a)" />
      <path d="M18.8 6H26L16 27V20.4L18.8 6z" fill="var(--team-b)" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <Mark size={26} />
      <span className="font-display text-[1.2rem] sm:text-[1.35rem] leading-none tracking-[0.14em] uppercase">
        VeTool
      </span>
    </span>
  )
}
