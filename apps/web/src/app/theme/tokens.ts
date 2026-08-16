/**
 * VeTool design tokens — arena scoreboard.
 * CSS variables in globals.css are the runtime source.
 * This module is the typed contract for components.
 */

export const fonts = {
  display: 'var(--font-display)',
  body: 'var(--font-body)',
  mono: 'var(--font-mono)',
} as const

export const radius = {
  none: '0px',
  sm: '2px',
  md: '4px',
  lg: '6px',
} as const

export const arena = {
  bg: '#07080c',
  bgSecondary: '#0c1018',
  card: '#12171f',
  cardHover: '#171d28',
  border: '#232a38',
  borderSubtle: '#1a2030',
  text: '#f4f1ea',
  textSecondary: '#c8c3b8',
  textMuted: '#7d8494',
  teamA: '#ff3b4e',
  teamAHover: '#ff5566',
  teamASoft: 'rgba(255, 59, 78, 0.14)',
  teamB: '#3b82ff',
  teamBHover: '#5c97ff',
  teamBSoft: 'rgba(59, 130, 255, 0.14)',
  success: '#2ee59d',
  successSoft: 'rgba(46, 229, 157, 0.14)',
  danger: '#ff3b4e',
  dangerSoft: 'rgba(255, 59, 78, 0.14)',
  warning: '#ffb020',
  warningSoft: 'rgba(255, 176, 32, 0.14)',
  cs2: '#f0a202',
  val: '#ff4655',
} as const

export const day = {
  bg: '#ece8df',
  bgSecondary: '#e2ddd2',
  card: '#f7f4ee',
  cardHover: '#fffdf8',
  border: '#cfc8b8',
  borderSubtle: '#ddd7ca',
  text: '#12141a',
  textSecondary: '#2c3038',
  textMuted: '#5c616c',
  teamA: '#e11d38',
  teamAHover: '#c4122c',
  teamASoft: 'rgba(225, 29, 56, 0.12)',
  teamB: '#1d4ed8',
  teamBHover: '#1e40af',
  teamBSoft: 'rgba(29, 78, 216, 0.12)',
  success: '#0f9f6e',
  successSoft: 'rgba(15, 159, 110, 0.12)',
  danger: '#e11d38',
  dangerSoft: 'rgba(225, 29, 56, 0.12)',
  warning: '#c47b00',
  warningSoft: 'rgba(196, 123, 0, 0.12)',
  cs2: '#c47b00',
  val: '#e11d38',
} as const

export const teams = {
  A: { fg: 'var(--team-a)', soft: 'var(--team-a-soft)', label: 'Team A' },
  B: { fg: 'var(--team-b)', soft: 'var(--team-b-soft)', label: 'Team B' },
} as const

export type TeamId = keyof typeof teams
