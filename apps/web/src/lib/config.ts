const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:5000/api/v1'

function normalizeApiBase(input: string) {
  const trimmed = input.replace(/\/$/, '')
  // If the user provided a full path that already includes /api/..., keep it.
  if (/\/api\/v\d+$/i.test(trimmed) || /\/api$/i.test(trimmed)) {
    return trimmed.endsWith('/api') ? `${trimmed}/v1` : trimmed
  }
  // Otherwise, append the default API path.
  return `${trimmed}/api/v1`
}

export const API_BASE = normalizeApiBase(rawApiBase)

export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin
  } catch {
    return 'http://localhost:5000'
  }
})()

function buildHubUrl(overridePath: string | undefined, defaultPath: string) {
  if (overridePath) {
    try {
      // Support absolute URLs or paths relative to the API origin.
      return new URL(overridePath, API_ORIGIN).toString()
    } catch {
      // Fall through to default
    }
  }
  return `${API_ORIGIN}${defaultPath}`
}

export const HUB_LOBBY_URL = buildHubUrl(
  process.env.NEXT_PUBLIC_SIGNALR_URL || process.env.NEXT_PUBLIC_HUB_LOBBY,
  '/hubs/lobby'
)

export const HUB_VETO_URL = buildHubUrl(
  process.env.NEXT_PUBLIC_SIGNALR_VETO_URL || process.env.NEXT_PUBLIC_HUB_VETO,
  '/hubs/veto'
)

export const JWT_COOKIE_NAME = process.env.NEXT_PUBLIC_JWT_COOKIE_NAME || 'vetool_jwt'
