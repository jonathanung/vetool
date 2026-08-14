import { describe, expect, it } from 'vitest'
import { normalizeTeam, rosterFromMembers } from './teams'

describe('normalizeTeam', () => {
  it('maps A-side tokens including numeric TeamSide', () => {
    expect(normalizeTeam('A')).toBe('A')
    expect(normalizeTeam('a')).toBe('A')
    expect(normalizeTeam(1)).toBe('A')
    expect(normalizeTeam('1')).toBe('A')
    expect(normalizeTeam('teamA')).toBe('A')
  })

  it('maps B-side tokens and does not treat B as A', () => {
    expect(normalizeTeam('B')).toBe('B')
    expect(normalizeTeam('b')).toBe('B')
    expect(normalizeTeam(2)).toBe('B')
    expect(normalizeTeam('2')).toBe('B')
    expect(normalizeTeam('team_b')).toBe('B')
  })

  it('returns None for unassigned or unknown values', () => {
    expect(normalizeTeam(0)).toBe('None')
    expect(normalizeTeam('Unassigned')).toBe('None')
    expect(normalizeTeam(undefined)).toBe('None')
  })
})

describe('rosterFromMembers', () => {
  it('hydrates captains and sides from membership rows', () => {
    const roster = rosterFromMembers([
      { id: 'cap-a', role: 'Owner', team: 'A' },
      { id: 'cap-b', role: 'Captain', team: 2 },
      { id: 'pick', role: 'Member', team: 'A' },
      { id: 'free', role: 'Member', team: 'Unassigned' },
    ])
    expect(roster.teamA).toEqual(['cap-a', 'pick'])
    expect(roster.teamB).toEqual(['cap-b'])
    expect(roster.captainA).toBe('cap-a')
    expect(roster.captainB).toBe('cap-b')
  })
})
