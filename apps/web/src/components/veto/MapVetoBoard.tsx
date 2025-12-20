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
  countdownEndTime?: number | null
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
  const seconds = Math.ceil(timeLeft / 1000)
  const isLowTime = seconds <= 10

  return (
    <div className="space-y-6" role="region" aria-label="Map veto board">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bento-badge bento-badge-primary">{mode.toUpperCase()}</span>
          <span className="text-sm text-text-muted">Step {stepIndex + 1}</span>
        </div>
        <div
          className={`px-4 py-2 rounded-bento-sm font-medium ${
            isLowTime
              ? 'bg-danger-soft text-danger animate-pulse'
              : nextTeam === 'A'
              ? 'bg-primary-soft text-primary'
              : nextTeam === 'B'
              ? 'bg-accent-soft text-accent'
              : 'bg-bg-secondary text-text-muted'
          }`}
          aria-live="polite"
        >
          {nextTeam === 'None' ? (
            'Waiting...'
          ) : (
            <>Team {nextTeam} - {seconds}s</>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Available Maps */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Available Maps</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="listbox" aria-label="Available maps">
            {maps.map((m) => (
              <li key={m.id}>
                <button
                  className={`w-full p-4 rounded-bento text-left transition-all border ${
                    canAct
                      ? isDirect
                        ? 'border-success/20 hover:border-success hover:bg-success-soft'
                        : 'border-danger/20 hover:border-danger hover:bg-danger-soft'
                      : 'border-border opacity-50 cursor-not-allowed'
                  }`}
                  role="option"
                  aria-label={`Map ${m.name}`}
                  onClick={() => (isDirect ? onPick(m.id) : onBan(m.id))}
                  disabled={!canAct}
                >
                  <span className="font-semibold block">{m.name}</span>
                  <span className="text-xs text-text-muted">{m.code}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted">
            {isDirect ? 'Click a map to pick it' : 'Click a map to ban it'}
          </p>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bento-card p-4 space-y-2">
            <h3 className="font-semibold">Actions</h3>
            <p className="text-sm text-text-muted">
              {isDirect ? 'Select the final map to play' : 'Ban maps to narrow down the pool'}
            </p>
          </div>

          {/* Banned Maps */}
          {bans.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-danger" />
                Banned
              </h4>
              <ul className="space-y-1.5">
                {bans.map((mapId) => (
                  <li
                    key={mapId}
                    className="px-3 py-2 rounded-bento-sm bg-danger-soft text-danger text-sm line-through"
                  >
                    {mapId}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Picked Maps */}
          {picks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Picked
              </h4>
              <ul className="space-y-1.5">
                {picks.map((mapId, idx) => (
                  <li
                    key={mapId}
                    className="px-3 py-2 rounded-bento-sm bg-success-soft text-success text-sm font-medium"
                  >
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
