"use client"
import { useEffect, useState } from 'react'
import { applyTheme, initTheme, ThemePreset } from '@/app/theme/preset'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { initTheme() }, [])
  return <>{children}</>
}

export function ThemeSwitcher() {
  const [preset, setPreset] = useState<ThemePreset>('neon')

  useEffect(() => {
    const stored = (localStorage.getItem('vetool-theme') as ThemePreset) || 'neon'
    setPreset(stored)
  }, [])

  function toggle() {
    const next = preset === 'neon' ? 'soft' : 'neon'
    applyTheme(next)
    setPreset(next)
  }

  return (
    <button type="button" onClick={toggle} className="bento-btn bento-btn-ghost text-sm px-3 py-2">
      {preset === 'neon' ? 'Soft' : 'Neon'}
    </button>
  )
}
