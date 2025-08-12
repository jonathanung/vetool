"use client"
import { useEffect } from 'react'
import { useLobbyStore } from '@/stores/lobbyStore'

type EventEnvelope = { event: string; seq: number; occurredAt: string; payload: any }

export default function LobbyClient({ lobbyId }: { lobbyId: string }) {
  const { init, teamA, teamB } = useLobbyStore()

  useEffect(() => {
    init(lobbyId)
  }, [init, lobbyId])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-1">Team A</h3>
          <ul className="text-sm space-y-1">
            {teamA.map(id => (<li key={id} className="rounded border px-2 py-1">{id}</li>))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium mb-1">Team B</h3>
          <ul className="text-sm space-y-1">
            {teamB.map(id => (<li key={id} className="rounded border px-2 py-1">{id}</li>))}
          </ul>
        </div>
      </div>
    </div>
  )
} 