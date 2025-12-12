"use client"
import { useEffect, useMemo, useState } from 'react'
import CaptainPicker from '@/components/captain/CaptainPicker'
import { useLobbyStore } from '@/stores/lobbyStore'

type Member = { id: string; name: string }

export default function LobbyClient({ lobbyId, initialMembers }: { lobbyId: string; initialMembers: Member[] }) {
  const { init, disconnect, teamA, teamB, members } = useLobbyStore()
  const [joining, setJoining] = useState(true)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [guestLoading, setGuestLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function joinAndConnect() {
      setJoining(true)
      setJoinError(null)
      const res = await fetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        if (!active) return
        setJoinError(`Failed to join lobby (${res.status})`)
        setJoining(false)
        return
      }
      await init(lobbyId, initialMembers)
      if (active) setJoining(false)
    }
    joinAndConnect()
    return () => {
      active = false
      disconnect()
    }
  }, [init, lobbyId, initialMembers, disconnect])

  const memberMap = useMemo(() => {
    const m = new Map<string, string>()
    members.forEach(mem => m.set(mem.id, mem.name))
    return m
  }, [members])

  const unassigned = useMemo(() => {
    const picked = new Set([...teamA, ...teamB])
    return members.filter(m => !picked.has(m.id))
  }, [members, teamA, teamB])

  async function handleGuestJoin() {
    setGuestLoading(true)
    setJoinError(null)
    try {
      const res = await fetch(`/api/lobbies/${lobbyId}/guest`, { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        setJoinError(`Guest join failed (${res.status})`)
        return
      }
      const joinRes = await fetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST', credentials: 'include' })
      if (!joinRes.ok) {
        setJoinError(`Failed to join lobby (${joinRes.status})`)
        return
      }
      await init(lobbyId, initialMembers)
      setJoining(false)
    } finally {
      setGuestLoading(false)
    }
  }

  if (joinError) {
    return (
      <div className="space-y-2 text-sm">
        <div className="text-red-600">{joinError}</div>
        <button
          type="button"
          onClick={handleGuestJoin}
          disabled={guestLoading}
          className="rounded border px-3 py-2"
        >
          {guestLoading ? 'Joining as guest…' : 'Join as guest'}
        </button>
      </div>
    )
  }
  if (joining) return <div className="text-sm text-gray-500">Joining lobby…</div>

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 card-glass">
          <h2 className="font-medium mb-2">Captain selection</h2>
          <CaptainPicker players={members} />
        </div>
        <div className="rounded-2xl p-4 card-glass">
          <h2 className="font-medium mb-2">Realtime</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-1">Team A</h3>
              <ul className="text-sm space-y-1">
                {teamA.map(id => (<li key={id} className="rounded border px-2 py-1">{memberMap.get(id) || id}</li>))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">Team B</h3>
              <ul className="text-sm space-y-1">
                {teamB.map(id => (<li key={id} className="rounded border px-2 py-1">{memberMap.get(id) || id}</li>))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">Unassigned</h3>
              <ul className="text-sm space-y-1">
                {unassigned.map(m => (<li key={m.id} className="rounded border px-2 py-1">{m.name}</li>))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}