import React from 'react'
import clsx from 'clsx'

type Props = { children: React.ReactNode; className?: string; tone?: 'default' | 'success' | 'danger' }

export default function Badge({ children, className, tone = 'default' }: Props) {
  const toneClass = tone === 'success' ? 'bg-emerald-600/20 text-emerald-300' : tone === 'danger' ? 'bg-rose-600/20 text-rose-300' : 'bg-[var(--card-glass)] text-[var(--text)]'
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs', toneClass, className)}>
      {children}
    </span>
  )
} 