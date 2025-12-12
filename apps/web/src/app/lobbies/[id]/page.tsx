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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{lobby.name}</h1>
        <Link className="text-sm underline" href="/lobbies">Back</Link>
      </div>
      <LobbyClient lobbyId={params.id} initialMembers={players} />
    </div>
  )
}