'use client'
import { useEffect, useMemo } from 'react'
import CaptainPicker from '@/components/captain/CaptainPicker'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  connect,
  disconnect,
  type Member,
} from '@/store/slices/lobbySlice'
import { useJoinLobbyMutation, useJoinAsGuestMutation } from '@/store/api/lobbiesApi'
import { addToast } from '@/store/slices/uiSlice'

export default function LobbyClient({ lobbyId, initialMembers }: { lobbyId: string; initialMembers: Member[] }) {
  const dispatch = useAppDispatch()
  const { connectionStatus, teamA, teamB, members, error } = useAppSelector((state) => state.lobby)

  const [joinLobby, { isLoading: joining, error: joinError }] = useJoinLobbyMutation()
  const [joinAsGuest, { isLoading: guestLoading }] = useJoinAsGuestMutation()

  // Join lobby and connect to SignalR on mount
  useEffect(() => {
    let active = true

    async function joinAndConnect() {
      try {
        await joinLobby(lobbyId).unwrap()
        if (active) {
          dispatch(connect({ lobbyId, initialMembers }))
        }
      } catch (err: any) {
        // Join failed - user might need to join as guest
        if (active) {
          dispatch(addToast({ type: 'error', message: `Failed to join lobby (${err?.status || 'unknown'})` }))
        }
      }
    }

    joinAndConnect()

    // Cleanup: disconnect on unmount
    return () => {
      active = false
      dispatch(disconnect())
    }
  }, [dispatch, lobbyId, initialMembers, joinLobby])

  // Create member name map
  const memberMap = useMemo(() => {
    const m = new Map<string, string>()
    members.forEach((mem) => m.set(mem.id, mem.name))
    return m
  }, [members])

  // Calculate unassigned members
  const unassigned = useMemo(() => {
    const picked = new Set([...teamA, ...teamB])
    return members.filter((m) => !picked.has(m.id))
  }, [members, teamA, teamB])

  // Handle guest join
  async function handleGuestJoin() {
    try {
      await joinAsGuest(lobbyId).unwrap()
      await joinLobby(lobbyId).unwrap()
      dispatch(connect({ lobbyId, initialMembers }))
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: `Guest join failed (${err?.status || 'unknown'})` }))
    }
  }

  // Show error state with guest join option
  if (joinError) {
    return (
      <div className="space-y-2 text-sm">
        <div className="text-red-600">Failed to join lobby. You may need to join as a guest.</div>
        <button
          type="button"
          onClick={handleGuestJoin}
          disabled={guestLoading}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          {guestLoading ? 'Joining as guest...' : 'Join as guest'}
        </button>
      </div>
    )
  }

  // Show connecting state
  if (connectionStatus === 'connecting' || joining) {
    return <div className="text-sm text-gray-500">Joining lobby...</div>
  }

  // Show connection error with retry
  if (connectionStatus === 'error') {
    return (
      <div className="space-y-2 text-sm">
        <div className="text-red-600">{error || 'Connection error'}</div>
        <button
          type="button"
          onClick={() => dispatch(connect({ lobbyId, initialMembers }))}
          className="rounded border px-3 py-2"
        >
          Retry connection
        </button>
      </div>
    )
  }

  // Show reconnecting indicator
  const isReconnecting = connectionStatus === 'reconnecting'

  return (
    <div className="space-y-4">
      {isReconnecting && (
        <div className="text-sm text-yellow-600 animate-pulse">Reconnecting...</div>
      )}
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
                {teamA.map((id) => (
                  <li key={id} className="rounded border px-2 py-1">
                    {memberMap.get(id) || id}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">Team B</h3>
              <ul className="text-sm space-y-1">
                {teamB.map((id) => (
                  <li key={id} className="rounded border px-2 py-1">
                    {memberMap.get(id) || id}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">Unassigned</h3>
              <ul className="text-sm space-y-1">
                {unassigned.map((m) => (
                  <li key={m.id} className="rounded border px-2 py-1">
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
