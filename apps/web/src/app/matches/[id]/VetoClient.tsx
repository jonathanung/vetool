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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Match veto</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="bento-badge bento-badge-warning">{game === 'val' ? 'VALORANT' : 'CS2'}</span>
            <span className="bento-badge bento-badge-primary">BO{bestOf}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bento-card p-5 space-y-3">
          <h2 className="font-semibold text-primary">Team A</h2>
          <ul className="space-y-1.5">
            {teamA.length === 0 ? <li className="text-sm text-text-muted">No roster yet</li> : teamA.map((p) => (
              <li key={p.userId} className="text-sm px-3 py-2 rounded-bento-sm bg-primary-soft text-primary">{playerName(p)}</li>
            ))}
          </ul>
        </div>
        <div className="bento-card p-5 space-y-3">
          <h2 className="font-semibold text-accent">Team B</h2>
          <ul className="space-y-1.5">
            {teamB.length === 0 ? <li className="text-sm text-text-muted">No roster yet</li> : teamB.map((p) => (
              <li key={p.userId} className="text-sm px-3 py-2 rounded-bento-sm bg-accent-soft text-accent">{playerName(p)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bento-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Join details</h2>
            <p className="text-sm text-text-muted">
              {game === 'val' ? 'Party or custom-game code' : 'CS2 connect string / server info'}
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
              placeholder={game === 'val' ? 'ABCDE1' : 'connect 203.0.113.10:27015; password scrim'}
            />
            <button type="submit" disabled={saving} className="bento-btn bento-btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        ) : (
          <div className="font-mono text-sm px-4 py-3 rounded-bento-sm bg-bg-secondary">
            {details.trim() || 'Host has not posted join details yet.'}
          </div>
        )}
      </div>

      {connectionStatus === 'connecting' && (
        <div className="bento-card p-8 text-center text-text-muted">Connecting to veto session...</div>
      )}

      {connectionStatus === 'error' && (
        <div className="bento-card p-6 space-y-4">
          <h2 className="font-semibold">Connection error</h2>
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
        <div className="bento-card p-6 space-y-3">
          <h2 className="font-semibold">Selected maps</h2>
          <ul className="space-y-2">
            {resolvedPicks.map((mapId, idx) => {
              const mapInfo = maps.concat(selectedMaps).find((m) => m.id === mapId)
              return (
                <li key={mapId} className="px-3 py-2 rounded-bento-sm bg-success-soft text-success text-sm font-medium">
                  Map {idx + 1}: {mapInfo?.name || mapId}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {connectionStatus !== 'error' && connectionStatus !== 'connecting' && !isComplete && (
        <div className="bento-card p-6">
          {connectionStatus === 'reconnecting' && (
            <div className="text-sm text-warning mb-4">Reconnecting — veto state is kept.</div>
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
