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

  useEffect(() => {
    let active = true

    async function joinAndConnect() {
      try {
        await joinLobby(lobbyId).unwrap()
        if (active) {
          dispatch(connect({ lobbyId, initialMembers }))
        }
      } catch (err: any) {
        if (active) {
          dispatch(addToast({ type: 'error', message: `Failed to join lobby (${err?.status || 'unknown'})` }))
        }
      }
    }

    joinAndConnect()

    return () => {
      active = false
      dispatch(disconnect())
    }
  }, [dispatch, lobbyId, initialMembers, joinLobby])

  const memberMap = useMemo(() => {
    const m = new Map<string, string>()
    members.forEach((mem) => m.set(mem.id, mem.name))
    return m
  }, [members])

  const unassigned = useMemo(() => {
    const picked = new Set([...teamA, ...teamB])
    return members.filter((m) => !picked.has(m.id))
  }, [members, teamA, teamB])

  async function handleGuestJoin() {
    try {
      await joinAsGuest(lobbyId).unwrap()
      await joinLobby(lobbyId).unwrap()
      dispatch(connect({ lobbyId, initialMembers }))
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: `Guest join failed (${err?.status || 'unknown'})` }))
    }
  }

  if (joinError) {
    return (
      <div className="bento-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-bento-sm bg-danger-soft flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Unable to join lobby</h3>
            <p className="text-sm text-text-muted">You may need to join as a guest to participate.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGuestJoin}
          disabled={guestLoading}
          className="bento-btn bento-btn-primary"
        >
          {guestLoading ? 'Joining...' : 'Join as Guest'}
        </button>
      </div>
    )
  }

  if (connectionStatus === 'connecting' || joining) {
    return (
      <div className="bento-card p-8 text-center">
        <div className="animate-pulse text-text-muted">Joining lobby...</div>
      </div>
    )
  }

  if (connectionStatus === 'error') {
    return (
      <div className="bento-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-bento-sm bg-danger-soft flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Connection Error</h3>
            <p className="text-sm text-text-muted">{error || 'Unable to connect to the lobby'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch(connect({ lobbyId, initialMembers }))}
          className="bento-btn bento-btn-secondary"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  const isReconnecting = connectionStatus === 'reconnecting'

  return (
    <div className="space-y-6">
      {isReconnecting && (
        <div className="bento-card p-3 bg-warning-soft border-warning/20">
          <div className="flex items-center gap-2 text-sm text-warning">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Reconnecting...
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Captain Selection */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-bento-sm bg-primary-soft flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="font-semibold">Captain Selection</h2>
          </div>
          <CaptainPicker players={members} />
        </div>

        {/* Team Overview */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-bento-sm bg-accent-soft flex items-center justify-center">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="font-semibold">Live Teams</h2>
            <span className="bento-badge bento-badge-success ml-auto">Live</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-primary">Team A</h3>
              <ul className="space-y-1.5">
                {teamA.length === 0 ? (
                  <li className="text-sm text-text-muted">No players yet</li>
                ) : (
                  teamA.map((id) => (
                    <li key={id} className="text-sm px-3 py-2 rounded-bento-sm bg-primary-soft text-primary">
                      {memberMap.get(id) || id}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-accent">Team B</h3>
              <ul className="space-y-1.5">
                {teamB.length === 0 ? (
                  <li className="text-sm text-text-muted">No players yet</li>
                ) : (
                  teamB.map((id) => (
                    <li key={id} className="text-sm px-3 py-2 rounded-bento-sm bg-accent-soft text-accent">
                      {memberMap.get(id) || id}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-muted">Unassigned</h3>
              <ul className="space-y-1.5">
                {unassigned.length === 0 ? (
                  <li className="text-sm text-text-muted">All assigned</li>
                ) : (
                  unassigned.map((m) => (
                    <li key={m.id} className="text-sm px-3 py-2 rounded-bento-sm bg-bg-secondary text-text-secondary">
                      {m.name}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
