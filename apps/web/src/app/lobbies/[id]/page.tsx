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

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/lobbies"
            className="text-sm text-text-muted hover:text-text transition-colors inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to lobbies
          </Link>
          <h1 className="text-2xl font-bold">{lobby.name}</h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="bento-badge bento-badge-warning">{gameLabel(lobby.game)}</span>
            <span className="bento-badge bento-badge-muted">
              {lobby.memberCount ?? members.length}/{lobby.maxPlayers ?? 10} players
            </span>
            {lobby.isPublic === false && <span className="bento-badge bento-badge-muted">Private</span>}
          </div>
        </div>
      </div>
      <LobbyClient
        lobbyId={params.id}
        initialMembers={players}
        game={gameLabel(lobby.game)}
        maxPlayers={lobby.maxPlayers ?? 10}
        currentMatchId={lobby.currentMatchId ?? null}
        hostUserId={lobby.createdByUserId ?? null}
      />
    </div>
  )
}
