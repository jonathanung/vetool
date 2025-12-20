'use client'
import { useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCaptains, updateTeams } from '@/store/slices/lobbySlice'

interface Props {
  players: { id: string; name: string }[]
}

export default function CaptainPicker({ players }: Props) {
  const dispatch = useAppDispatch()
  const { teamA, teamB, captainA: storedCaptainA, captainB: storedCaptainB } = useAppSelector((state) => state.lobby)

  const [localCaptainA, setLocalCaptainA] = useState<string | undefined>(storedCaptainA ?? undefined)
  const [localCaptainB, setLocalCaptainB] = useState<string | undefined>(storedCaptainB ?? undefined)

  const captainA = storedCaptainA || localCaptainA
  const captainB = storedCaptainB || localCaptainB

  const pattern = useMemo(() => [1, 2, 2, 2, 1], [])
  const [step, setStep] = useState(0)
  const [teamTurn, setTeamTurn] = useState<'A' | 'B'>('A')
  const [remainingPicks, setRemainingPicks] = useState<number>(pattern[0])

  function handleSelectCaptain(team: 'A' | 'B', id: string) {
    if (team === 'A') {
      setLocalCaptainA(id)
    } else {
      setLocalCaptainB(id)
      if (localCaptainA && id) {
        dispatch(setCaptains({ captainA: localCaptainA, captainB: id }))
        setTeamTurn('A')
        setStep(0)
        setRemainingPicks(pattern[0])
      }
    }
  }

  function handlePick(playerId: string) {
    if (!captainA || !captainB) return

    const nextA = teamA.slice()
    const nextB = teamB.slice()

    if (teamTurn === 'A') {
      nextA.push(playerId)
    } else {
      nextB.push(playerId)
    }

    dispatch(updateTeams({ teamA: nextA, teamB: nextB }))

    const nextRemaining = remainingPicks - 1
    if (nextRemaining > 0) {
      setRemainingPicks(nextRemaining)
      return
    }

    const nextStep = step + 1
    setStep(nextStep)
    const nextCount = pattern[nextStep % pattern.length]
    setRemainingPicks(nextCount)
    setTeamTurn(teamTurn === 'A' ? 'B' : 'A')
  }

  const picked = useMemo(() => {
    const s = new Set([...teamA, ...teamB])
    if (captainA) s.add(captainA)
    if (captainB) s.add(captainB)
    return s
  }, [teamA, teamB, captainA, captainB])

  const unpicked = players.filter((p) => !picked.has(p.id))

  return (
    <div className="space-y-6" role="group" aria-label="Captain picker">
      {/* Captain Selection Phase */}
      {(!captainA || !captainB) && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Team A Captain */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${captainA ? 'bg-success' : 'bg-warning animate-pulse'}`} />
              <h3 className="font-medium text-sm">
                {captainA ? (
                  <span className="text-success">
                    Captain A: {players.find((p) => p.id === captainA)?.name}
                  </span>
                ) : (
                  'Select Captain A'
                )}
              </h3>
            </div>
            {!captainA && (
              <ul className="space-y-1.5" aria-label="Choose captain A">
                {players.map((p) => (
                  <li key={p.id}>
                    <button
                      className="w-full text-left px-4 py-2.5 rounded-bento-sm bg-bg-secondary hover:bg-primary-soft hover:text-primary transition-all text-sm disabled:opacity-50"
                      onClick={() => handleSelectCaptain('A', p.id)}
                      aria-label={`Select ${p.name} as Captain A`}
                      disabled={!!captainA || !!captainB}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Team B Captain */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${captainB ? 'bg-success' : captainA ? 'bg-warning animate-pulse' : 'bg-border'}`} />
              <h3 className="font-medium text-sm">
                {captainB ? (
                  <span className="text-success">
                    Captain B: {players.find((p) => p.id === captainB)?.name}
                  </span>
                ) : (
                  'Select Captain B'
                )}
              </h3>
            </div>
            {captainA && !captainB && (
              <ul className="space-y-1.5" aria-label="Choose captain B">
                {players
                  .filter((p) => p.id !== captainA)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        className="w-full text-left px-4 py-2.5 rounded-bento-sm bg-bg-secondary hover:bg-accent-soft hover:text-accent transition-all text-sm disabled:opacity-50"
                        onClick={() => handleSelectCaptain('B', p.id)}
                        aria-label={`Select ${p.name} as Captain B`}
                        disabled={!captainA || !!captainB}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Draft Phase */}
      {captainA && captainB && (
        <div className="space-y-4">
          {/* Turn Indicator */}
          <div className="flex items-center justify-between p-4 rounded-bento-sm bg-bg-secondary">
            <div className="space-y-1">
              <div className="text-xs text-text-muted uppercase tracking-wide">Current Turn</div>
              <div className={`font-semibold ${teamTurn === 'A' ? 'text-primary' : 'text-accent'}`}>
                Team {teamTurn}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs text-text-muted uppercase tracking-wide">Picks Remaining</div>
              <div className="font-semibold">{remainingPicks}</div>
            </div>
          </div>

          {/* Draft Pattern */}
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <span>Pattern:</span>
            {pattern.map((p, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded ${
                  i === step ? 'bg-primary text-primary-contrast' : 'bg-bg-secondary'
                }`}
              >
                {p}
              </span>
            ))}
          </div>

          {/* Available Players */}
          {unpicked.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-secondary">Available Players</h4>
              <ul className="grid grid-cols-2 gap-2" aria-label="Available players" aria-live="polite">
                {unpicked.map((p) => (
                  <li key={p.id}>
                    <button
                      className={`w-full text-left px-4 py-3 rounded-bento-sm border transition-all text-sm ${
                        teamTurn === 'A'
                          ? 'border-primary/20 hover:bg-primary-soft hover:text-primary hover:border-primary'
                          : 'border-accent/20 hover:bg-accent-soft hover:text-accent hover:border-accent'
                      }`}
                      onClick={() => handlePick(p.id)}
                      aria-label={`Pick ${p.name} for Team ${teamTurn}`}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-bento-sm bg-success-soft text-center">
              <span className="text-success font-medium">All players have been drafted!</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
