import React from 'react'
import clsx from 'clsx'

type Props = { children: React.ReactNode; className?: string; tone?: 'default' | 'success' | 'danger' }

export default function Badge({ children, className, tone = 'default' }: Props) {
  const toneClass =
    tone === 'success'
      ? 'bento-badge-success'
      : tone === 'danger'
        ? 'bento-badge-danger'
        : 'bento-badge-muted'
  return (
    <span className={clsx('bento-badge', toneClass, className)}>
      {children}
    </span>
  )
}
