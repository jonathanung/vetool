export function remainingLabel(expiresAt: string | Date | undefined, nowMs = Date.now()): string {
  if (!expiresAt) return ''
  const end = typeof expiresAt === 'string' ? Date.parse(expiresAt) : expiresAt.getTime()
  if (Number.isNaN(end)) return ''
  const ms = end - nowMs
  if (ms <= 0) return 'Expired'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`
  if (hours >= 1) return `${hours}h ${minutes}m left`
  if (minutes >= 1) return `${minutes}m left`
  return 'Under 1m left'
}
