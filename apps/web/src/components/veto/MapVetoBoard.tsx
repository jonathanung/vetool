"use client"
import { useEffect, useMemo, useState } from 'react'

interface MapTile { id: string; code: string; name: string }

interface Props {
  mode: 'bo3'|'bo5'|'direct'
  maps: MapTile[]
  nextTeam: 'A'|'B'|'None'
  stepIndex: number
  onBan: (mapId: string)=>void
  onPick: (mapId: string)=>void
  countdownMs?: number
}

export default function MapVetoBoard({ mode, maps, nextTeam, stepIndex, onBan, onPick, countdownMs=30000 }: Props) {
  const [timeLeft, setTimeLeft] = useState(countdownMs)
  useEffect(()=>{
    setTimeLeft(countdownMs)
    const t = setInterval(()=> setTimeLeft((t)=> Math.max(0, t-1000)), 1000)
    return ()=> clearInterval(t)
  }, [countdownMs, stepIndex])

  const isDirect = mode === 'direct'
  const canAct = nextTeam !== 'None' && timeLeft > 0

  return (
    <div className="space-y-4" role="region" aria-label="Map veto board">
      <div className="flex items-center justify-between">
        <div className="text-sm">Mode: {mode.toUpperCase()} • Step {stepIndex+1}</div>
        <div className="rounded border px-2 py-1 text-sm" aria-live="polite">Turn: Team {nextTeam} • {Math.ceil(timeLeft/1000)}s</div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium">Available</h3>
          <ul className="grid grid-cols-2 gap-2" role="listbox" aria-label="Available maps">
            {maps.map(m => (
              <li key={m.id}>
                <button className="w-full rounded border p-3" role="option" aria-label={`Map ${m.name}`}
                  onClick={()=> isDirect ? onPick(m.id) : onBan(m.id)} disabled={!canAct}>
                  <span className="font-medium">{m.name}</span>
                  <div className="text-xs text-gray-500">{m.code}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium">Actions</h3>
          <div className="text-sm text-gray-600 dark:text-gray-300">{isDirect ? 'Select final map' : 'Ban to narrow the pool'}</div>
          <p className="text-xs text-gray-500">Keyboard: Tab to focus, Enter to select.</p>
        </div>
      </div>
    </div>
  )
} 