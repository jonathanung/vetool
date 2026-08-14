import { describe, expect, it } from 'vitest'
import { pickChoiceLabel, startingSide } from './vetoChoice'

describe('startingSide', () => {
  it('first pick starts on team A and last pick starts on team B', () => {
    expect(startingSide('first')).toBe('A')
    expect(startingSide('last')).toBe('B')
  })
})

describe('pickChoiceLabel', () => {
  it('labels first and last pick', () => {
    expect(pickChoiceLabel('first')).toBe('first pick')
    expect(pickChoiceLabel('last')).toBe('last pick')
  })
})
