export type ThemePreset = 'neon' | 'soft'

export const themes: Record<ThemePreset, { className: string; dataTheme?: string }> = {
  neon: { className: 'dark' },
  soft: { className: '', dataTheme: 'soft' },
}

export function applyTheme(preset: ThemePreset) {
  const theme = themes[preset]
  const html = document.documentElement
  html.classList.remove('dark')
  if (theme.className) html.classList.add(theme.className)
  if (theme.dataTheme) html.setAttribute('data-theme', theme.dataTheme)
  else html.removeAttribute('data-theme')
  html.classList.toggle('dark', preset === 'neon')
  localStorage.setItem('vetool-theme', preset)
}

export function initTheme() {
  const stored = (localStorage.getItem('vetool-theme') as ThemePreset) || null
  applyTheme(stored || 'neon')
} 