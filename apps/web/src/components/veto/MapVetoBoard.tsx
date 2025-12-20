'use client'
import { useEffect, useState } from 'react'

interface MapTile {
  id: string
  code: string
  name: string
}

interface Props {
  mode: 'bo3' | 'bo5' | 'direct'
  maps: MapTile[]
  nextTeam: 'A' | 'B' | 'None'
  stepIndex: number
  onBan: (mapId: string) => void
  onPick: (mapId: string) => void
  countdownEndTime?: number | null // Unix timestamp when countdown ends
  picks?: string[]
  bans?: string[]
}

export default function MapVetoBoard({
  mode,
  maps,
  nextTeam,
  stepIndex,
  onBan,
  onPick,
  countdownEndTime,
  picks = [],
  bans = [],
}: Props) {
  const [timeLeft, setTimeLeft] = useState(30000)

  // Sync countdown with server time
  useEffect(() => {
    if (!countdownEndTime) {
      setTimeLeft(30000)
      return
    }

    function updateTime() {
      const remaining = Math.max(0, countdownEndTime! - Date.now())
      setTimeLeft(remaining)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [countdownEndTime, stepIndex])

  const isDirect = mode === 'direct'
  const canAct = nextTeam !== 'None' && timeLeft > 0

  return (
    <div className="space-y-4" role="region" aria-label="Map veto board">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          Mode: {mode.toUpperCase()} - Step {stepIndex + 1}
        </div>
        <div className="rounded border px-2 py-1 text-sm" aria-live="polite">
          Turn: Team {nextTeam} - {Math.ceil(timeLeft / 1000)}s
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">Available Maps</h3>
          <ul className="grid grid-cols-2 gap-2" role="listbox" aria-label="Available maps">
            {maps.map((m) => (
              <li key={m.id}>
                <button
                  className="w-full rounded border p-3 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  role="option"
                  aria-label={`Map ${m.name}`}
                  onClick={() => (isDirect ? onPick(m.id) : onBan(m.id))}
                  disabled={!canAct}
                >
                  <span className="font-medium">{m.name}</span>
                  <div className="text-xs text-gray-500">{m.code}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Actions</h3>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {isDirect ? 'Select final map' : 'Ban to narrow the pool'}
            </div>
            <p className="text-xs text-gray-500">Keyboard: Tab to focus, Enter to select.</p>
          </div>

          {bans.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-1">Banned</h4>
              <ul className="text-sm space-y-1">
                {bans.map((mapId) => (
                  <li key={mapId} className="text-gray-500 line-through">
                    {mapId}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {picks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-1">Picked</h4>
              <ul className="text-sm space-y-1">
                {picks.map((mapId, idx) => (
                  <li key={mapId} className="text-green-600">
                    Map {idx + 1}: {mapId}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
