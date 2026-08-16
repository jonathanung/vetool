import { getLobby, getLobbyMembers } from '@/lib/lobbies'
import { normalizeTeam } from '@/lib/teams'
import LobbyClient from './realtime'
import Link from 'next/link'

function gameLabel(game: string | number | undefined) {
  const key = String(game ?? '').toLowerCase()
  if (key === '1' || key === 'val' || key === 'valorant') return 'VALORANT'
  return 'CS2'
}

export default async function LobbyDetailPage({ params }: { params: { id: string } }) {
  const [lobby, members] = await Promise.all([
    getLobby(params.id),
    getLobbyMembers(params.id)
  ])

  const players = members.map(m => ({
    id: m.userId,
    name: m.displayName || m.userName,
    role: String(m.role),
    team: normalizeTeam(m.team),
  }))

  const game = gameLabel(lobby.game)
  const isVal = game === 'VALORANT'

  return (
    <div className="container mx-auto py-8 space-y-8 animate-fade-in">
      <Link
        href="/lobbies"
        className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-[0.16em] uppercase text-text-muted hover:text-text transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to lobbies
      </Link>

      <header className="relative overflow-hidden border border-border bg-card">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-team-a" />
        <div className="absolute inset-y-0 right-0 w-1.5 bg-team-b" />
        <div className="px-6 py-8 md:px-10 md:py-10 space-y-4">
          <p className="kicker">Broadcast</p>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.85]">
            {lobby.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className={`bento-badge ${isVal ? 'chip-val' : 'chip-cs2'}`}>{game}</span>
            <span className="bento-badge bento-badge-muted">
              {lobby.memberCount ?? members.length}/{lobby.maxPlayers ?? 10} players
            </span>
            {lobby.isPublic === false && <span className="bento-badge bento-badge-muted">Private</span>}
          </div>
        </div>
      </header>

      <LobbyClient
        lobbyId={params.id}
        initialMembers={players}
        game={game}
        maxPlayers={lobby.maxPlayers ?? 10}
        currentMatchId={lobby.currentMatchId ?? null}
        hostUserId={lobby.createdByUserId ?? null}
      />
    </div>
  )
}
