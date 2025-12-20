import { getLobby, getLobbyMembers } from '@/lib/lobbies'
import LobbyClient from './realtime'
import Link from 'next/link'

export default async function LobbyDetailPage({ params }: { params: { id: string } }) {
  const [lobby, members] = await Promise.all([
    getLobby(params.id),
    getLobbyMembers(params.id)
  ])

  const players = members.map(m => ({ id: m.userId, name: m.displayName || m.userName }))

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
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
        </div>
      </div>
      <LobbyClient lobbyId={params.id} initialMembers={players} />
    </div>
  )
}
