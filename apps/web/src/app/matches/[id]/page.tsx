import { apiGet } from '@/lib/api'
import VetoClient from './VetoClient'

async function getMatch(id: string) {
  return apiGet<any>(`/matches/${id}`)
}

export default async function MatchPage({ params }: { params: { id: string } }) {
  const match = await getMatch(params.id)
  const maps = (match.maps ?? match.Maps ?? []) as { id: string; code: string; name: string }[]
  const selectedMaps = (match.selectedMaps ?? match.SelectedMaps ?? []) as { id: string; code: string; name: string }[]
  const bestOf = Number(match.bestOf ?? match.BestOf ?? 1)
  const mode = bestOf === 1 ? 'bo1' : bestOf === 3 ? 'bo3' : 'bo5'
  const game = String(match.game ?? match.Game ?? 'cs2').toLowerCase()
  const veto = match.veto ?? match.Veto
  const nextAction = (veto?.nextAction ?? veto?.NextAction ?? null) as 'ban' | 'pick' | null

  return (
    <div className="container mx-auto py-8">
      <VetoClient
        matchId={params.id}
        mode={mode}
        maps={maps}
        selectedMaps={selectedMaps}
        game={game}
        bestOf={bestOf}
        joinDetails={match.joinDetails ?? match.JoinDetails}
        teamA={match.teamA ?? match.TeamA ?? []}
        teamB={match.teamB ?? match.TeamB ?? []}
        hostUserId={match.createdByUserId ?? match.CreatedByUserId ?? null}
        nextAction={nextAction}
      />
    </div>
  )
}
