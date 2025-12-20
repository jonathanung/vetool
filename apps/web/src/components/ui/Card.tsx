import clsx from 'clsx'

interface CardProps {
  className?: string
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export default function Card({
  className,
  interactive = false,
  padding = 'md',
  children
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={clsx(
        interactive ? 'bento-card-interactive' : 'bento-card',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}
