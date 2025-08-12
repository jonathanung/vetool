import clsx from 'clsx'

export default function Card({ className, glass, children }: { className?: string; glass?: boolean; children: React.ReactNode }) {
  return (
    <div className={clsx('rounded-2xl p-4', glass ? 'card-glass' : 'card', className)}>
      {children}
    </div>
  )
} 