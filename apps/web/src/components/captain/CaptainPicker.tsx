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

    const nextA = teamA.includes(captainA) ? teamA.slice() : [captainA, ...teamA]
    const nextB = teamB.includes(captainB) ? teamB.slice() : [captainB, ...teamB]

    if (teamTurn === 'A') {
      if (!nextA.includes(playerId)) nextA.push(playerId)
    } else if (!nextB.includes(playerId)) {
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
      {(!captainA || !captainB) && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 ${captainA ? 'bg-success' : 'bg-warning animate-pulse'}`} />
              <h3 className="font-display text-2xl leading-none">
                {captainA ? (
                  <span className="text-team-a">
                    {players.find((p) => p.id === captainA)?.name}
                  </span>
                ) : (
                  <span className="text-team-a">Select Captain A</span>
                )}
              </h3>
            </div>
            {captainA && (
              <span className="bento-badge chip-a">Captain A</span>
            )}
            {!captainA && (
              <ul className="space-y-1.5" aria-label="Choose captain A">
                {players.map((p) => (
                  <li key={p.id}>
                    <button
                      className="w-full text-left px-4 py-3 border border-border bg-bg-secondary hover:bg-primary-soft hover:text-team-a hover:border-team-a transition-colors text-sm font-medium disabled:opacity-50"
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

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 ${captainB ? 'bg-success' : captainA ? 'bg-warning animate-pulse' : 'bg-border'}`} />
              <h3 className="font-display text-2xl leading-none">
                {captainB ? (
                  <span className="text-team-b">
                    {players.find((p) => p.id === captainB)?.name}
                  </span>
                ) : (
                  <span className="text-team-b">Select Captain B</span>
                )}
              </h3>
            </div>
            {captainB && (
              <span className="bento-badge chip-b">Captain B</span>
            )}
            {captainA && !captainB && (
              <ul className="space-y-1.5" aria-label="Choose captain B">
                {players
                  .filter((p) => p.id !== captainA)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        className="w-full text-left px-4 py-3 border border-border bg-bg-secondary hover:bg-accent-soft hover:text-team-b hover:border-team-b transition-colors text-sm font-medium disabled:opacity-50"
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

      {captainA && captainB && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-stretch justify-between gap-4 border border-border bg-bg-secondary p-4">
            <div className="space-y-1">
              <div className="kicker">Current turn</div>
              <div className={`font-display text-5xl leading-none ${teamTurn === 'A' ? 'text-team-a' : 'text-team-b'}`}>
                Team {teamTurn}
              </div>
            </div>
            <div className="stat min-w-[8rem]">
              <div className="stat-value">{remainingPicks}</div>
              <div className="stat-label">Picks remaining</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
            <span className="kicker mr-1">Pattern</span>
            {pattern.map((p, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 font-mono ${
                  i === step ? 'bg-team-a text-white' : 'bg-bg-secondary border border-border'
                }`}
              >
                {p}
              </span>
            ))}
          </div>

          {unpicked.length > 0 ? (
            <div className="space-y-2">
              <h4 className="kicker">Available players</h4>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" aria-label="Available players" aria-live="polite">
                {unpicked.map((p) => (
                  <li key={p.id}>
                    <button
                      className={`w-full text-left px-3 py-2 border text-sm font-medium transition-colors ${
                        teamTurn === 'A'
                          ? 'border-team-a/30 hover:bg-primary-soft hover:text-team-a hover:border-team-a'
                          : 'border-team-b/30 hover:bg-accent-soft hover:text-team-b hover:border-team-b'
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
            <div className="p-4 border border-success/30 bg-success-soft text-center">
              <span className="font-display text-2xl text-success">All players have been drafted</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
