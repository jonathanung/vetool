'use client'
import { useEffect, useState } from 'react'
import MapVetoBoard from '@/components/veto/MapVetoBoard'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  connect,
  disconnect,
  ban,
  pick,
  type VetoMode,
  type MapTile,
} from '@/store/slices/matchSlice'
import { useGetMeQuery } from '@/store/api/authApi'
import { useSetJoinDetailsMutation, type RosterPlayer } from '@/store/api/matchesApi'
import { addToast } from '@/store/slices/uiSlice'

interface Props {
  matchId: string
  mode: 'direct' | 'bo1' | 'bo3' | 'bo5'
  maps: { id: string; code: string; name: string }[]
  selectedMaps: { id: string; code: string; name: string }[]
  game: string
  bestOf: number
  joinDetails?: string | null
  teamA: RosterPlayer[]
  teamB: RosterPlayer[]
  hostUserId?: string | null
  nextAction?: 'ban' | 'pick' | null
}

function playerName(p: RosterPlayer) {
  return p.displayName || p.userName
}

function RosterColumn({
  side,
  players,
}: {
  side: 'A' | 'B'
  players: RosterPlayer[]
}) {
  const isA = side === 'A'
  return (
    <div className={`p-5 space-y-4 ${isA ? '' : 'border-t md:border-t-0 md:border-l border-border'}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={`font-mono text-2xs uppercase tracking-[0.18em] ${isA ? 'text-team-a' : 'text-team-b'}`}>
            {isA ? 'Red side' : 'Blue side'}
          </p>
          <h2 className={`font-display text-4xl leading-none mt-1 ${isA ? 'text-team-a' : 'text-team-b'}`}>
            Team {side}
          </h2>
        </div>
        <span className={`font-display text-4xl leading-none ${isA ? 'text-team-a' : 'text-team-b'}`}>
          {players.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {players.length === 0 ? (
          <li className="text-sm text-text-muted font-mono uppercase tracking-[0.12em]">No roster yet</li>
        ) : (
          players.map((p, idx) => (
            <li
              key={p.userId}
              className={`flex items-center gap-3 text-sm px-3 py-2 ${
                isA ? 'bg-primary-soft text-team-a' : 'bg-accent-soft text-team-b'
              }`}
            >
              <span className="font-mono text-2xs opacity-70">{String(idx + 1).padStart(2, '0')}</span>
              <span className="font-medium">{playerName(p)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default function VetoClient({
  matchId,
  mode,
  maps,
  selectedMaps,
  game,
  bestOf,
  joinDetails,
  teamA,
  teamB,
  hostUserId,
  nextAction,
}: Props) {
  const dispatch = useAppDispatch()
  const { data: me } = useGetMeQuery()
  const [setJoinDetails, { isLoading: saving }] = useSetJoinDetailsMutation()
  const [details, setDetails] = useState(joinDetails ?? '')
  const [copied, setCopied] = useState(false)

  const {
    connectionStatus,
    nextTeam,
    stepIndex,
    availableMaps,
    picks,
    bans,
    isComplete,
    error,
    countdownEndTime,
    nextAction: liveAction,
  } = useAppSelector((state) => state.match)

  const isHost = !!me?.id && !!hostUserId && me.id === hostUserId
  const isVal = game === 'val'

  useEffect(() => {
    dispatch(connect({ matchId, mode: mode as VetoMode, maps: maps as MapTile[] }))
    return () => {
      dispatch(disconnect())
    }
  }, [dispatch, matchId, mode, maps])

  const handleBan = (mapId: string) => dispatch(ban(mapId))
  const handlePick = (mapId: string) => dispatch(pick(mapId))

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault()
    try {
      await setJoinDetails({ matchId, joinDetails: details }).unwrap()
      dispatch(addToast({ type: 'success', message: 'Join details saved' }))
    } catch {
      dispatch(addToast({ type: 'error', message: 'Could not save join details' }))
    }
  }

  async function handleCopy() {
    if (!details.trim()) return
    try {
      await navigator.clipboard.writeText(details)
      setCopied(true)
      dispatch(addToast({ type: 'success', message: 'Join details copied' }))
      setTimeout(() => setCopied(false), 1600)
    } catch {
      dispatch(addToast({ type: 'error', message: 'Could not copy' }))
    }
  }

  const resolvedPicks = picks.length ? picks : selectedMaps.map((m) => m.id)
  const showComplete = isComplete || (resolvedPicks.length > 0 && nextTeam === 'None' && connectionStatus === 'connected' && availableMaps.length === 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="kicker">Live series</p>
          <h1 className="font-display text-5xl sm:text-6xl leading-none">Match veto</h1>
          <div className="flex flex-wrap gap-2">
            <span className={`bento-badge ${isVal ? 'chip-val' : 'chip-cs2'}`}>
              {isVal ? 'VALORANT' : 'CS2'}
            </span>
            <span className="bento-badge chip-a">BO{bestOf}</span>
          </div>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="grid md:grid-cols-2">
          <RosterColumn side="A" players={teamA} />
          <RosterColumn side="B" players={teamB} />
        </div>
      </div>

      <div className="bento-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="kicker">Command</p>
            <h2 className="font-display text-3xl leading-none">Join details</h2>
            <p className="text-sm text-text-muted">
              {isVal ? 'Party or custom-game code' : 'CS2 connect string / server info'}
            </p>
          </div>
          <button type="button" onClick={handleCopy} disabled={!details.trim()} className="bento-btn bento-btn-secondary">
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {isHost ? (
          <form onSubmit={handleSaveDetails} className="flex flex-col sm:flex-row gap-3">
            <input
              className="bento-input font-mono"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={isVal ? 'ABCDE1' : 'connect 203.0.113.10:27015; password scrim'}
            />
            <button type="submit" disabled={saving} className="bento-btn bento-btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        ) : (
          <div className="font-mono text-sm px-4 py-3 bg-bg-secondary border border-border">
            {details.trim() || 'Host has not posted join details yet.'}
          </div>
        )}
      </div>

      {connectionStatus === 'connecting' && (
        <div className="bento-card p-10 text-center space-y-2">
          <p className="kicker mx-auto justify-center">Live hub</p>
          <p className="font-display text-3xl">Connecting to veto session...</p>
          <p className="text-sm text-text-muted">Holding the board until the hub answers.</p>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="bento-card p-6 space-y-4">
          <p className="kicker">Signal lost</p>
          <h2 className="font-display text-3xl leading-none">Connection error</h2>
          <p className="text-sm text-text-muted">{error || 'Unable to connect to the veto hub'}</p>
          <button
            type="button"
            onClick={() => dispatch(connect({ matchId, mode: mode as VetoMode, maps: maps as MapTile[] }))}
            className="bento-btn bento-btn-secondary"
          >
            Retry
          </button>
        </div>
      )}

      {(showComplete || isComplete) && (
        <div className="bento-card p-6 space-y-4">
          <p className="kicker">Series locked</p>
          <h2 className="font-display text-3xl leading-none">Selected maps</h2>
          <ul className="space-y-2">
            {resolvedPicks.map((mapId, idx) => {
              const mapInfo = maps.concat(selectedMaps).find((m) => m.id === mapId)
              return (
                <li key={mapId} className="flex items-center gap-3 px-3 py-3 bg-success-soft text-success text-sm font-medium">
                  <span className="font-mono text-2xs tracking-[0.14em]">MAP {idx + 1}</span>
                  <span className="font-display text-2xl leading-none">
                    Map {idx + 1}: {mapInfo?.name || mapId}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {connectionStatus !== 'error' && connectionStatus !== 'connecting' && !isComplete && (
        <div className="bento-card p-6">
          {connectionStatus === 'reconnecting' && (
            <div className="text-sm text-warning mb-4 font-mono uppercase tracking-[0.12em]">
              Reconnecting — veto state is kept.
            </div>
          )}
          <MapVetoBoard
            mode={mode}
            maps={availableMaps.length ? availableMaps : maps}
            allMaps={maps}
            nextTeam={nextTeam}
            nextAction={liveAction ?? nextAction ?? null}
            stepIndex={stepIndex}
            onBan={handleBan}
            onPick={handlePick}
            countdownEndTime={countdownEndTime}
            picks={picks}
            bans={bans}
          />
        </div>
      )}
    </div>
  )
}
