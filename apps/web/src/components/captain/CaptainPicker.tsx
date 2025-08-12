"use client"
import { useMemo, useState } from 'react'
import { useLobbyStore } from '@/stores/lobbyStore'

interface Props {
  players: { id: string; name: string }[]
}

export default function CaptainPicker({ players }: Props) {
  const [captainA, setCaptainA] = useState<string|undefined>()
  const [captainB, setCaptainB] = useState<string|undefined>()
  const pattern = useMemo(() => [1,2,2,2,1], [])
  const [step, setStep] = useState(0)
  const [teamTurn, setTeamTurn] = useState<'A'|'B'>('A')
  const [remainingPicks, setRemainingPicks] = useState<number>(pattern[0])
  const { setCaptains, updateTeams, teamA, teamB } = useLobbyStore()

  function handleSelectCaptain(team: 'A'|'B', id: string) {
    if (team === 'A') setCaptainA(id); else setCaptainB(id)
    if (team === 'B' && captainA && id) {
      setCaptains(captainA, id)
      setTeamTurn('A'); setStep(0); setRemainingPicks(pattern[0])
    }
  }

  function handlePick(playerId: string) {
    if (!captainA || !captainB) return
    const nextA = teamA.slice()
    const nextB = teamB.slice()
    if (teamTurn === 'A') nextA.push(playerId); else nextB.push(playerId)
    updateTeams(nextA, nextB)
    const nextRemaining = remainingPicks - 1
    if (nextRemaining > 0) { setRemainingPicks(nextRemaining); return }
    const nextStep = step + 1
    setStep(nextStep)
    const nextCount = pattern[nextStep % pattern.length]
    setRemainingPicks(nextCount)
    setTeamTurn(teamTurn === 'A' ? 'B' : 'A')
  }

  const picked = new Set([...teamA, ...teamB])
  if (captainA) picked.add(captainA)
  if (captainB) picked.add(captainB)
  const unpicked = players.filter(p => !picked.has(p.id))

  return (
    <div className="grid md:grid-cols-3 gap-4" role="group" aria-label="Captain picker">
      <div>
        <h3 className="font-medium">Team A {captainA && `(Captain: ${players.find(p=>p.id===captainA)?.name})`}</h3>
        {!captainA && (
          <ul className="space-y-1" aria-label="Choose captain A">
            {players.map(p => (
              <li key={p.id}><button className="w-full rounded border p-2 disabled:opacity-50" onClick={()=>handleSelectCaptain('A', p.id)} aria-label={`Select ${p.name} as Captain A`} disabled={!!captainA || !!captainB}>{p.name}</button></li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-medium">Team B {captainB && `(Captain: ${players.find(p=>p.id===captainB)?.name})`}</h3>
        {!captainB && (
          <ul className="space-y-1" aria-label="Choose captain B">
            {players.filter(p=>p.id!==captainA).map(p => (
              <li key={p.id}><button className="w-full rounded border p-2 disabled:opacity-50" onClick={()=>handleSelectCaptain('B', p.id)} aria-label={`Select ${p.name} as Captain B`} disabled={!captainA || !!captainB}>{p.name}</button></li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-medium">Pick order</h3>
        <div className="text-sm text-gray-600 dark:text-gray-300">Pattern: 1 / 2 / 2 / 2 / 1</div>
        {captainA && captainB && (
          <div className="mt-2 space-y-2" aria-live="polite">
            <div className="rounded border p-2" role="status">Turn: Team {teamTurn}</div>
            <div className="text-xs text-gray-500">Take {remainingPicks} pick(s)</div>
            <ul className="space-y-1" aria-label="Available players">
              {unpicked.map(p => (
                <li key={p.id}><button className="w-full rounded border p-2 disabled:opacity-50" onClick={()=>handlePick(p.id)} aria-label={`Pick ${p.name} for Team ${teamTurn}`}>{p.name}</button></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
} 