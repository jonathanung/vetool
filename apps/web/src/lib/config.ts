function normalizeApiBase(input: string) {
  const trimmed = input.replace(/\/$/, '')
  if (/\/api\/v\d+$/i.test(trimmed) || /\/api$/i.test(trimmed)) {
    return trimmed.endsWith('/api') ? `${trimmed}/v1` : trimmed
  }
  return `${trimmed}/api/v1`
}

function serverApiBase() {
  return normalizeApiBase(
    process.env.API_BASE_INTERNAL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:5001/api/v1'
  )
}

/** Browser calls stay on the page origin so a Mac hitting this host does not fetch its own localhost. */
export function getApiBase(): string {
  if (typeof window === 'undefined') return serverApiBase()
  return '/api/v1'
}

/** @deprecated use getApiBase() — kept for server route handlers that import a constant. */
export const API_BASE = typeof window === 'undefined' ? serverApiBase() : '/api/v1'

export function getApiOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin
  try {
    return new URL(serverApiBase()).origin
  } catch {
    return 'http://localhost:5001'
  }
}

export const API_ORIGIN = typeof window === 'undefined' ? getApiOrigin() : ''

export function getHubLobbyUrl(): string {
  if (process.env.NEXT_PUBLIC_SIGNALR_URL || process.env.NEXT_PUBLIC_HUB_LOBBY) {
    const override = process.env.NEXT_PUBLIC_SIGNALR_URL || process.env.NEXT_PUBLIC_HUB_LOBBY || ''
    if (typeof window !== 'undefined') return new URL(override, window.location.origin).toString()
    return new URL(override, getApiOrigin()).toString()
  }
  if (typeof window !== 'undefined') return `${window.location.origin}/hubs/lobby`
  return `${getApiOrigin()}/hubs/lobby`
}

export function getHubVetoUrl(): string {
  if (process.env.NEXT_PUBLIC_SIGNALR_VETO_URL || process.env.NEXT_PUBLIC_HUB_VETO) {
    const override = process.env.NEXT_PUBLIC_SIGNALR_VETO_URL || process.env.NEXT_PUBLIC_HUB_VETO || ''
    if (typeof window !== 'undefined') return new URL(override, window.location.origin).toString()
    return new URL(override, getApiOrigin()).toString()
  }
  if (typeof window !== 'undefined') return `${window.location.origin}/hubs/veto`
  return `${getApiOrigin()}/hubs/veto`
}

export const HUB_LOBBY_URL = '/hubs/lobby'
export const HUB_VETO_URL = '/hubs/veto'

export const JWT_COOKIE_NAME = process.env.NEXT_PUBLIC_JWT_COOKIE_NAME || 'vetool_jwt'
