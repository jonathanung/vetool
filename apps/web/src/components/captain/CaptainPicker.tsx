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

  // Local UI state for captain selection flow
  const [localCaptainA, setLocalCaptainA] = useState<string | undefined>(storedCaptainA ?? undefined)
  const [localCaptainB, setLocalCaptainB] = useState<string | undefined>(storedCaptainB ?? undefined)

  // Use stored captains if available, otherwise use local state
  const captainA = storedCaptainA || localCaptainA
  const captainB = storedCaptainB || localCaptainB

  // Pick pattern: 1-2-2-2-1
  const pattern = useMemo(() => [1, 2, 2, 2, 1], [])
  const [step, setStep] = useState(0)
  const [teamTurn, setTeamTurn] = useState<'A' | 'B'>('A')
  const [remainingPicks, setRemainingPicks] = useState<number>(pattern[0])

  function handleSelectCaptain(team: 'A' | 'B', id: string) {
    if (team === 'A') {
      setLocalCaptainA(id)
    } else {
      setLocalCaptainB(id)
      // When both captains are selected, dispatch to server
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

    // Dispatch team update to server via SignalR
    dispatch(updateTeams({ teamA: nextA, teamB: nextB }))

    const nextRemaining = remainingPicks - 1
    if (nextRemaining > 0) {
      setRemainingPicks(nextRemaining)
      return
    }

    // Advance to next step
    const nextStep = step + 1
    setStep(nextStep)
    const nextCount = pattern[nextStep % pattern.length]
    setRemainingPicks(nextCount)
    setTeamTurn(teamTurn === 'A' ? 'B' : 'A')
  }

  // Calculate picked players (including captains)
  const picked = useMemo(() => {
    const s = new Set([...teamA, ...teamB])
    if (captainA) s.add(captainA)
    if (captainB) s.add(captainB)
    return s
  }, [teamA, teamB, captainA, captainB])

  const unpicked = players.filter((p) => !picked.has(p.id))

  return (
    <div className="grid md:grid-cols-3 gap-4" role="group" aria-label="Captain picker">
      <div>
        <h3 className="font-medium">
          Team A {captainA && `(Captain: ${players.find((p) => p.id === captainA)?.name})`}
        </h3>
        {!captainA && (
          <ul className="space-y-1" aria-label="Choose captain A">
            {players.map((p) => (
              <li key={p.id}>
                <button
                  className="w-full rounded border p-2 disabled:opacity-50"
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
      <div>
        <h3 className="font-medium">
          Team B {captainB && `(Captain: ${players.find((p) => p.id === captainB)?.name})`}
        </h3>
        {!captainB && (
          <ul className="space-y-1" aria-label="Choose captain B">
            {players
              .filter((p) => p.id !== captainA)
              .map((p) => (
                <li key={p.id}>
                  <button
                    className="w-full rounded border p-2 disabled:opacity-50"
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
      <div>
        <h3 className="font-medium">Pick order</h3>
        <div className="text-sm text-gray-600 dark:text-gray-300">Pattern: 1 / 2 / 2 / 2 / 1</div>
        {captainA && captainB && (
          <div className="mt-2 space-y-2" aria-live="polite">
            <div className="rounded border p-2" role="status">
              Turn: Team {teamTurn}
            </div>
            <div className="text-xs text-gray-500">Take {remainingPicks} pick(s)</div>
            <ul className="space-y-1" aria-label="Available players">
              {unpicked.map((p) => (
                <li key={p.id}>
                  <button
                    className="w-full rounded border p-2 disabled:opacity-50"
                    onClick={() => handlePick(p.id)}
                    aria-label={`Pick ${p.name} for Team ${teamTurn}`}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
