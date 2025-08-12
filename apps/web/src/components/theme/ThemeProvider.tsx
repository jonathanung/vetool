"use client"
import { useEffect, useState } from 'react'
import { applyTheme, initTheme, ThemePreset } from '@/app/theme/preset'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { initTheme(); setReady(true) }, [])
  if (!ready) return null
  return <>{children}</>
}

export function ThemeSwitcher() {
  const [preset, setPreset] = useState<ThemePreset>(() => (localStorage.getItem('vetool-theme') as ThemePreset) || 'neon')
  function toggle() {
    const next = preset === 'neon' ? 'soft' : 'neon'
    applyTheme(next)
    setPreset(next)
  }
  return (
    <button onClick={toggle} className="text-xs px-2 py-1 rounded-xl border border-muted bg-card-glass backdrop-blur">
      {preset === 'neon' ? 'Soft' : 'Neon'} theme
    </button>
  )
} 