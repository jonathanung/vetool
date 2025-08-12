"use client"
import React, { useState } from 'react'
import clsx from 'clsx'

export function Tabs({ tabs, onChange }: { tabs: { id: string; label: string }[]; onChange?: (id: string)=>void }) {
  const [active, setActive] = useState(tabs[0]?.id)
  return (
    <div className="inline-flex items-center rounded-xl border border-[var(--muted)] bg-[var(--card-glass)]">
      {tabs.map(t => (
        <button key={t.id} onClick={()=>{ setActive(t.id); onChange?.(t.id) }} className={clsx('px-3 py-1 text-sm rounded-xl', active===t.id ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'text-[var(--text)]')}>
          {t.label}
        </button>
      ))}
    </div>
  )
} 