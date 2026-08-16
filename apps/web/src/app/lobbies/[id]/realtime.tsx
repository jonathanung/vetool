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
import LobbyChat from '@/components/lobby/LobbyChat'

export default function LobbyClient({
  lobbyId,
  initialMembers,
  game,
  maxPlayers,
  currentMatchId,
  hostUserId,
  expired,
}: {
  lobbyId: string
  initialMembers: Member[]
  game: string
  maxPlayers: number
  currentMatchId: string | null
  hostUserId: string | null
  expired?: boolean
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
  const isVal = String(game).toLowerCase().includes('val')

  useEffect(() => {
    let active = true

    async function joinAndConnect() {
      if (expired) return
      try {
        await joinLobby(lobbyId).unwrap()
        if (active) {
          dispatch(connect({ lobbyId, initialMembers }))
        }
      } catch (err: any) {
        if (active) {
          const status = err?.status
          const message = status === 410
            ? 'This lobby expired.'
            : status === 409
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
        <p className="kicker">Error</p>
        <h3 className="font-display text-3xl text-danger">Unable to join lobby</h3>
        <p className="text-sm text-text-muted">The lobby may be full, missing, or you need to join as a guest.</p>
        <button type="button" onClick={handleGuestJoin} disabled={guestLoading} className="bento-btn bento-btn-primary">
          {guestLoading ? 'Joining...' : 'Join as Guest'}
        </button>
      </div>
    )
  }

  if (connectionStatus === 'connecting' || joining) {
    return (
      <div className="bento-card p-8 space-y-3">
        <p className="kicker">Live</p>
        <h3 className="font-display text-3xl">Joining lobby...</h3>
        <p className="text-sm text-text-muted">Hold — seating the room.</p>
      </div>
    )
  }

  if (connectionStatus === 'error') {
    return (
      <div className="bento-card p-6 space-y-4">
        <p className="kicker">Error</p>
        <h3 className="font-display text-3xl text-danger">Connection Error</h3>
        <p className="text-sm text-text-muted">{error || 'Unable to connect to the lobby'}</p>
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
        <div className="bento-card p-4 bg-warning-soft">
          <div className="flex items-center gap-3">
            <span className="kicker">Live</span>
            <span className="font-display text-2xl text-warning">Reconnecting</span>
            <span className="text-sm text-text-muted">Membership is still saved.</span>
          </div>
        </div>
      )}

      <div className="bento-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="kicker">SHARE</div>
          <div className="font-mono text-sm truncate text-text-secondary mt-1">{shareUrl || `/lobbies/${lobbyId}`}</div>
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

      <div className="grid md:grid-cols-2 gap-3">
        <section className="bento-card overflow-hidden">
          <div className="flex">
            <div className="w-1.5 shrink-0 bg-team-a" />
            <div className="flex-1 p-5 space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="kicker">Red</p>
                  <h2 className="font-display text-4xl text-team-a leading-none mt-1">Team A</h2>
                </div>
                <div className="stat py-2 px-3">
                  <div className="stat-value text-team-a text-3xl">{teamA.length}</div>
                  <div className="stat-label">Roster</div>
                </div>
              </div>
              <ul className="space-y-1.5">
                {teamA.length === 0 ? (
                  <li className="text-sm text-text-muted px-3 py-2 border border-border">No players yet</li>
                ) : (
                  teamA.map((id) => (
                    <li key={id} className="flex items-center justify-between gap-2 text-sm px-3 py-2 bg-primary-soft text-team-a">
                      <span className="truncate">{memberMap.get(id) || id}</span>
                      {id === captainA && <span className="bento-badge chip-a">C</span>}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="bento-card overflow-hidden">
          <div className="flex">
            <div className="w-1.5 shrink-0 bg-team-b" />
            <div className="flex-1 p-5 space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="kicker">Blue</p>
                  <h2 className="font-display text-4xl text-team-b leading-none mt-1">Team B</h2>
                </div>
                <div className="stat py-2 px-3">
                  <div className="stat-value text-team-b text-3xl">{teamB.length}</div>
                  <div className="stat-label">Roster</div>
                </div>
              </div>
              <ul className="space-y-1.5">
                {teamB.length === 0 ? (
                  <li className="text-sm text-text-muted px-3 py-2 border border-border">No players yet</li>
                ) : (
                  teamB.map((id) => (
                    <li key={id} className="flex items-center justify-between gap-2 text-sm px-3 py-2 bg-accent-soft text-team-b">
                      <span className="truncate">{memberMap.get(id) || id}</span>
                      {id === captainB && <span className="bento-badge chip-b">C</span>}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section className="bento-card p-5 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="kicker">Bench</p>
            <h3 className="font-display text-2xl leading-none mt-1">Unassigned</h3>
          </div>
          <span className="bento-badge bento-badge-muted">{unassigned.length}</span>
        </div>
        <ul className="flex flex-wrap gap-2">
          {unassigned.length === 0 ? (
            <li className="text-sm text-text-muted">All assigned</li>
          ) : (
            unassigned.map((m) => (
              <li key={m.id} className="text-sm px-3 py-2 border border-border bg-bg-secondary text-text-secondary">
                {m.name}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="bento-card p-6 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="kicker">Draft</p>
            <h2 className="font-display text-3xl leading-none mt-1">Captain Selection</h2>
          </div>
          <span className="bento-badge bento-badge-muted">{members.length}/{maxPlayers}</span>
        </div>
        <CaptainPicker players={members} />
      </section>

      <section className="bento-card p-6 space-y-4">
        <div>
          <p className="kicker">Pool</p>
          <h2 className="font-display text-3xl leading-none mt-1">map pool</h2>
        </div>
        <p className="text-sm text-text-muted">Defaults to active duty / ranked. Add or remove any catalog map.</p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {(mapData?.catalog ?? []).map((m) => {
            const on = (mapData?.selected ?? []).some((s) => s.id === m.id)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={!isHost || savingMaps}
                  onClick={() => toggleMap(m.id)}
                  className={`w-full min-h-[4.5rem] px-3 py-3 border text-left font-display text-xl leading-none tracking-wide ${
                    on
                      ? 'bg-team-a text-white border-team-a'
                      : 'border-border text-text-muted bg-transparent'
                  }`}
                >
                  {m.name}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <LobbyChat disabled={expired} />

      <section className="bento-card p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Command</p>
            <h2 className="font-display text-3xl leading-none mt-1">start veto</h2>
            <p className="text-sm text-text-muted mt-2">
              need two captains. choose first pick or last pick, then start.
            </p>
          </div>
          <span className={`bento-badge ${isVal ? 'chip-val' : 'chip-cs2'}`}>{game}</span>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <label className="kicker">Best of</label>
            <select className="bento-input min-w-[120px]" value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} disabled={!isHost}>
              <option value={1}>BO1</option>
              <option value={3}>BO3</option>
              <option value={5}>BO5</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="kicker">Team A wants</label>
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
            disabled={!isHost || starting || expired || (!currentMatchId && !canStartVeto)}
            className="bento-btn bento-btn-primary"
          >
            {starting ? 'Starting...' : currentMatchId ? 'Open match' : 'start veto'}
          </button>
          {currentMatchId && (
            <button type="button" onClick={() => router.push(`/matches/${currentMatchId}`)} className="bento-btn bento-btn-secondary">
              Go to veto
            </button>
          )}
          {!canStartVeto && <span className="text-xs font-mono tracking-[0.12em] uppercase text-text-muted">need two captains</span>}
        </div>
      </section>
    </div>
  )
}
