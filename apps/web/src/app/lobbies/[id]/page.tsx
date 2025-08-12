import { getLobby, getLobbyMembers } from '@/lib/lobbies'
import LobbyClient from './realtime'
import CaptainPicker from '@/components/captain/CaptainPicker'
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
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-4 card-glass">
          <h2 className="font-medium mb-2">Captain selection</h2>
          <CaptainPicker
            players={players}
          />
        </div>
        <div className="rounded-2xl p-4 card-glass">
          <h2 className="font-medium mb-2">Realtime</h2>
          <LobbyClient lobbyId={params.id} />
        </div>
      </section>
    </div>
  )
} 