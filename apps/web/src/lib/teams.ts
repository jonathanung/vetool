export type Side = 'A' | 'B' | 'None'

export function normalizeTeam(team: unknown): Side {
  if (team === 1 || team === '1') return 'A'
  if (team === 2 || team === '2') return 'B'
  const v = String(team ?? '').trim().toLowerCase()
  if (v === 'a' || v === 'teama' || v === 'team_a') return 'A'
  if (v === 'b' || v === 'teamb' || v === 'team_b') return 'B'
  return 'None'
}

export function isCaptainSeat(role: unknown, team: unknown): boolean {
  const side = normalizeTeam(team)
  if (side === 'None') return false
  const v = String(role ?? '').trim().toLowerCase()
  return v === 'captain' || v === 'owner' || v === '1' || v === '2'
}

export function rosterFromMembers(members: { id: string; role?: unknown; team?: unknown }[]) {
  const teamA: string[] = []
  const teamB: string[] = []
  let captainA: string | null = null
  let captainB: string | null = null
  for (const member of members) {
    const side = normalizeTeam(member.team)
    if (side === 'A') teamA.push(member.id)
    if (side === 'B') teamB.push(member.id)
    if (isCaptainSeat(member.role, member.team)) {
      if (side === 'A') captainA = member.id
      if (side === 'B') captainB = member.id
    }
  }
  return { teamA, teamB, captainA, captainB }
}
