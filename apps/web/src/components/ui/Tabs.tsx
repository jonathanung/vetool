"use client"
import React, { useState } from 'react'
import clsx from 'clsx'

export function Tabs({ tabs, onChange }: { tabs: { id: string; label: string }[]; onChange?: (id: string)=>void }) {
  const [active, setActive] = useState(tabs[0]?.id)
  return (
    <div className="inline-flex items-center border border-border bg-bg-secondary">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={()=>{ setActive(t.id); onChange?.(t.id) }}
          className={clsx(
            'px-4 py-2 text-xs font-mono font-semibold tracking-[0.14em] uppercase',
            active===t.id ? 'bg-team-a text-white' : 'text-text-muted hover:text-text'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
