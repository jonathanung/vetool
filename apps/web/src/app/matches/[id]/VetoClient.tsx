'use client'
import React from 'react'
import MapVetoBoard from '@/components/veto/MapVetoBoard'
import { useMatchStore } from '@/stores/matchStore'

export default function VetoClient({ matchId, mode, maps }: { matchId: string; mode: 'direct'|'bo3'|'bo5'; maps: { id: string; code: string; name: string }[] }) {
  const { init, nextTeam, stepIndex, availableMaps, ban, pick } = useMatchStore()
  React.useEffect(() => { init(matchId, mode, maps) }, [init, matchId, mode, maps])
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Match Veto</h1>
      <MapVetoBoard mode={mode} maps={availableMaps.length ? availableMaps : maps} nextTeam={nextTeam} stepIndex={stepIndex} onBan={ban} onPick={pick} />
    </div>
  )
} 