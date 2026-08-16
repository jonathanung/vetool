import { describe, expect, it } from 'vitest'
import { remainingLabel } from './lobbyTime'

describe('remainingLabel', () => {
  const now = Date.parse('2026-08-16T12:00:00Z')

  it('formats hours and minutes', () => {
    expect(remainingLabel('2026-08-16T17:20:00Z', now)).toBe('5h 20m left')
  })

  it('marks past times as expired', () => {
    expect(remainingLabel('2026-08-16T11:59:00Z', now)).toBe('Expired')
  })
})
