'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CaptainPicker from '@/components/captain/CaptainPicker'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  connect,
  disconnect,
  type Member,
} from '@/store/slices/lobbySlice'
import {
  useJoinLobbyMutation,
  useJoinAsGuestMutation,
  useLeaveLobbyMutation,
  useStartMatchMutation,
  useGetLobbyMapsQuery,
  useSetLobbyMapsMutation,
  useSetFirstPickMutation,
} from '@/store/api/lobbiesApi'
import { pickChoiceLabel, startingSide, type PickChoice } from '@/lib/vetoChoice'
import { useGetMeQuery } from '@/store/api/authApi'
import { addToast } from '@/store/slices/uiSlice'

export default function LobbyClient({
  lobbyId,
  initialMembers,
  game,
  maxPlayers,
  currentMatchId,
  hostUserId,
}: {
  lobbyId: string
  initialMembers: Member[]
  game: string
  maxPlayers: number
  currentMatchId: string | null
  hostUserId: string | null
}) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { connectionStatus, teamA, teamB, members, error, captainA, captainB } = useAppSelector((state) => state.lobby)
  const { data: me } = useGetMeQuery()

  const [joinLobby, { isLoading: joining, error: joinError }] = useJoinLobbyMutation()
  const [joinAsGuest, { isLoading: guestLoading }] = useJoinAsGuestMutation()
  const [leaveLobby, { isLoading: leaving }] = useLeaveLobbyMutation()
  const [startMatch, { isLoading: starting }] = useStartMatchMutation()
  const [setLobbyMaps, { isLoading: savingMaps }] = useSetLobbyMapsMutation()
  const [setFirstPick] = useSetFirstPickMutation()
  const { data: mapData } = useGetLobbyMapsQuery(lobbyId)
  const [bestOf, setBestOf] = useState(1)
  const [copied, setCopied] = useState(false)
  const [pickChoice, setPickChoice] = useState<PickChoice>('first')

  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/lobbies/${lobbyId}`
  const isHost = !!me?.id && !!hostUserId && me.id === hostUserId
  const canStartVeto = Boolean(captainA && captainB && members.length >= 2)

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
          const status = err?.status
          const message = status === 409
            ? 'This lobby is full.'
            : status === 404
              ? 'Lobby not found.'
              : `Failed to join lobby (${status || 'unknown'})`
          dispatch(addToast({ type: 'error', message }))
        }
      }
    }

    joinAndConnect()

    return () => {
      active = false
      dispatch(disconnect())
    }
  }, [dispatch, lobbyId, joinLobby])

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
      const status = err?.status
      dispatch(addToast({
        type: 'error',
        message: status === 409 ? 'This lobby is full.' : status === 404 ? 'Lobby not found.' : `Guest join failed (${status || 'unknown'})`,
      }))
    }
  }

  async function handleCopy() {
    const url = `${window.location.origin}/lobbies/${lobbyId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      dispatch(addToast({ type: 'success', message: 'Invite link copied' }))
      setTimeout(() => setCopied(false), 1600)
    } catch {
      dispatch(addToast({ type: 'error', message: 'Could not copy link' }))
    }
  }

  async function handleStart() {
    if (currentMatchId) {
      router.push(`/matches/${currentMatchId}`)
      return
    }
    if (!canStartVeto) {
      dispatch(addToast({ type: 'error', message: 'need two captains' }))
      return
    }
    try {
      await setFirstPick({ lobbyId, team: startingSide(pickChoice) }).unwrap()
      const result = await startMatch({ lobbyId, bestOf }).unwrap()
      const id = result?.id || result?.Id
      if (id) router.push(`/matches/${id}`)
    } catch {
      dispatch(addToast({ type: 'error', message: 'need two captains before veto' }))
    }
  }

  async function toggleMap(id: string) {
    if (!mapData || !isHost) return
    const selected = new Set((mapData.selected ?? []).map((m) => m.id))
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    if (selected.size === 0) {
      dispatch(addToast({ type: 'error', message: 'keep at least one map' }))
      return
    }
    try {
      await setLobbyMaps({ lobbyId, mapIds: [...selected] }).unwrap()
    } catch {
      dispatch(addToast({ type: 'error', message: 'could not update maps' }))
    }
  }

  async function handleLeave() {
    try {
      await leaveLobby(lobbyId).unwrap()
      dispatch(disconnect())
      router.push('/lobbies')
    } catch {
      dispatch(addToast({ type: 'error', message: 'Could not leave lobby' }))
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
            <p className="text-sm text-text-muted">The lobby may be full, missing, or you need to join as a guest.</p>
          </div>
        </div>
        <button type="button" onClick={handleGuestJoin} disabled={guestLoading} className="bento-btn bento-btn-primary">
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
        <button type="button" onClick={() => dispatch(connect({ lobbyId, initialMembers }))} className="bento-btn bento-btn-secondary">
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
            Reconnecting... membership is still saved.
          </div>
        </div>
      )}

      <div className="bento-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-text-muted mb-1">Share lobby</div>
          <div className="font-mono text-sm truncate text-text-secondary">{shareUrl || `/lobbies/${lobbyId}`}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleCopy} className="bento-btn bento-btn-secondary">
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button type="button" onClick={handleLeave} disabled={leaving} className="bento-btn bento-btn-ghost">
            Leave
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-bento-sm bg-primary-soft flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="font-semibold">Captain Selection</h2>
            <span className="text-xs text-text-muted ml-auto">{members.length}/{maxPlayers}</span>
          </div>
          <CaptainPicker players={members} />
        </div>

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

      <div className="bento-card p-6 space-y-4">
        <h2 className="font-semibold lowercase">map pool</h2>
        <p className="text-sm text-text-muted lowercase">defaults to active duty / ranked. add or remove any catalog map.</p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(mapData?.catalog ?? []).map((m) => {
            const on = (mapData?.selected ?? []).some((s) => s.id === m.id)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={!isHost || savingMaps}
                  onClick={() => toggleMap(m.id)}
                  className={`w-full text-left px-3 py-2 rounded-bento-sm border text-sm ${on ? 'bg-primary text-primary-contrast border-primary' : 'border-border text-text-muted'}`}
                >
                  {m.name}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="bento-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold lowercase">start veto</h2>
          <span className="bento-badge bento-badge-muted">{game}</span>
        </div>
        <p className="text-sm text-text-muted lowercase">
          need two captains. choose first pick or last pick, then start.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary lowercase">best of</label>
            <select className="bento-input min-w-[120px]" value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} disabled={!isHost}>
              <option value={1}>bo1</option>
              <option value={3}>bo3</option>
              <option value={5}>bo5</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary lowercase">team a wants</label>
            <select
              className="bento-input min-w-[140px]"
              value={pickChoice}
              onChange={(e) => setPickChoice(e.target.value as PickChoice)}
              disabled={!isHost}
            >
              <option value="first">{pickChoiceLabel('first')}</option>
              <option value="last">{pickChoiceLabel('last')}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleStart}
            disabled={!isHost || starting || (!currentMatchId && !canStartVeto)}
            className="bento-btn bento-btn-primary lowercase"
          >
            {starting ? 'starting...' : currentMatchId ? 'open match' : 'start veto'}
          </button>
          {currentMatchId && (
            <button type="button" onClick={() => router.push(`/matches/${currentMatchId}`)} className="bento-btn bento-btn-secondary lowercase">
              go to veto
            </button>
          )}
          {!canStartVeto && <span className="text-xs text-text-muted lowercase">need two captains</span>}
        </div>
      </div>
    </div>
  )
}
