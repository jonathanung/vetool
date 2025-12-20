'use client'
import { useEffect } from 'react'
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

interface Props {
  matchId: string
  mode: 'direct' | 'bo3' | 'bo5'
  maps: { id: string; code: string; name: string }[]
}

export default function VetoClient({ matchId, mode, maps }: Props) {
  const dispatch = useAppDispatch()
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
  } = useAppSelector((state) => state.match)

  // Connect on mount, disconnect on unmount (fixes missing cleanup bug)
  useEffect(() => {
    dispatch(connect({ matchId, mode: mode as VetoMode, maps: maps as MapTile[] }))

    return () => {
      dispatch(disconnect())
    }
  }, [dispatch, matchId, mode, maps])

  const handleBan = (mapId: string) => {
    dispatch(ban(mapId))
  }

  const handlePick = (mapId: string) => {
    dispatch(pick(mapId))
  }

  // Show connecting state
  if (connectionStatus === 'connecting') {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Match Veto</h1>
        <div className="text-sm text-gray-500">Connecting to veto session...</div>
      </div>
    )
  }

  // Show connection error
  if (connectionStatus === 'error') {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Match Veto</h1>
        <div className="text-sm text-red-600">{error || 'Connection error'}</div>
        <button
          onClick={() => dispatch(connect({ matchId, mode: mode as VetoMode, maps: maps as MapTile[] }))}
          className="rounded border px-3 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  // Show completion state
  if (isComplete) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Match Veto - Complete</h1>
        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-2">Selected Maps</h2>
          <ul className="space-y-1">
            {picks.map((mapId, idx) => {
              const mapInfo = maps.find((m) => m.id === mapId)
              return (
                <li key={mapId} className="text-sm">
                  Map {idx + 1}: {mapInfo?.name || mapId}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }

  // Show reconnecting indicator
  const isReconnecting = connectionStatus === 'reconnecting'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Match Veto</h1>
      {isReconnecting && (
        <div className="text-sm text-yellow-600 animate-pulse">Reconnecting...</div>
      )}
      <MapVetoBoard
        mode={mode}
        maps={availableMaps.length ? availableMaps : maps}
        nextTeam={nextTeam}
        stepIndex={stepIndex}
        onBan={handleBan}
        onPick={handlePick}
        countdownEndTime={countdownEndTime}
        picks={picks}
        bans={bans}
      />
    </div>
  )
}
