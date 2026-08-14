'use client'
import { useEffect, useState } from 'react'

interface MapTile {
  id: string
  code: string
  name: string
}

interface Props {
  mode: 'bo3' | 'bo5' | 'direct' | 'bo1'
  maps: MapTile[]
  allMaps?: MapTile[]
  nextTeam: 'A' | 'B' | 'None'
  nextAction?: 'ban' | 'pick' | null
  stepIndex: number
  onBan: (mapId: string) => void
  onPick: (mapId: string) => void
  countdownEndTime?: number | null
  picks?: string[]
  bans?: string[]
}

function labelFor(id: string, maps: MapTile[], allMaps: MapTile[]) {
  return allMaps.concat(maps).find((m) => m.id === id)?.name || id
}

export default function MapVetoBoard({
  mode,
  maps,
  allMaps = [],
  nextTeam,
  nextAction,
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

  const action = nextAction ?? (mode === 'direct' || mode === 'bo1' ? 'pick' : 'ban')
  const canAct = nextTeam !== 'None' && timeLeft > 0 && Boolean(action)
  const seconds = Math.ceil(timeLeft / 1000)
  const isLowTime = seconds <= 10
  const isPick = action === 'pick'

  return (
    <div className="space-y-6" role="region" aria-label="Map veto board">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bento-badge bento-badge-primary">{mode.toUpperCase()}</span>
          <span className="text-sm text-text-muted">Step {stepIndex + 1}</span>
          {action && (
            <span className={`bento-badge ${isPick ? 'bento-badge-success' : 'bento-badge-danger'}`}>
              {isPick ? 'Pick' : 'Ban'}
            </span>
          )}
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
          {nextTeam === 'None' ? 'Waiting...' : <>Team {nextTeam} — {seconds}s</>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Available Maps</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="listbox" aria-label="Available maps">
            {maps.map((m) => (
              <li key={m.id}>
                <button
                  className={`w-full p-4 rounded-bento text-left transition-all border ${
                    canAct
                      ? isPick
                        ? 'border-success/20 hover:border-success hover:bg-success-soft'
                        : 'border-danger/20 hover:border-danger hover:bg-danger-soft'
                      : 'border-border opacity-50 cursor-not-allowed'
                  }`}
                  role="option"
                  aria-label={`Map ${m.name}`}
                  onClick={() => (isPick ? onPick(m.id) : onBan(m.id))}
                  disabled={!canAct}
                >
                  <span className="font-semibold block">{m.name}</span>
                  <span className="text-xs text-text-muted">{m.code}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted">
            {isPick ? 'Click a map to pick it' : 'Click a map to ban it'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="bento-card p-4 space-y-2">
            <h3 className="font-semibold">Actions</h3>
            <p className="text-sm text-text-muted">
              {mode === 'bo3' || mode === 'bo5'
                ? 'Captains interleave bans and picks. The last remaining map is auto-picked.'
                : 'Ban down to a single map, or pick it directly.'}
            </p>
          </div>

          {bans.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-danger" />
                Banned
              </h4>
              <ul className="space-y-1.5">
                {bans.map((mapId) => (
                  <li key={mapId} className="px-3 py-2 rounded-bento-sm bg-danger-soft text-danger text-sm line-through">
                    {labelFor(mapId, maps, allMaps)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {picks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                Picked
              </h4>
              <ul className="space-y-1.5">
                {picks.map((mapId, idx) => (
                  <li key={mapId} className="px-3 py-2 rounded-bento-sm bg-success-soft text-success text-sm font-medium">
                    Map {idx + 1}: {labelFor(mapId, maps, allMaps)}
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
