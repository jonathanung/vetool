import { describe, expect, it } from 'vitest'
import { getApiBase, getHubLobbyUrl } from './config'

describe('getApiBase', () => {
  it('stays same-origin in the browser so a remote client does not fetch localhost', () => {
    expect(typeof window).not.toBe('undefined')
    expect(getApiBase()).toBe('/api/v1')
    expect(getApiBase().startsWith('http://localhost')).toBe(false)
    expect(getApiBase().includes('localhost:5001')).toBe(false)
  })
})

describe('getHubLobbyUrl', () => {
  it('uses the page origin for hubs', () => {
    expect(getHubLobbyUrl()).toBe(`${window.location.origin}/hubs/lobby`)
  })
})
