import { apiGet } from '@/lib/api'
import VetoClient from './VetoClient'

async function getMatch(id: string) {
  return apiGet<any>(`/matches/${id}`)
}

export default async function MatchPage({ params }: { params: { id: string } }) {
  const match = await getMatch(params.id)
  const maps = match.maps as { id: string; code: string; name: string }[]
  const mode = match.bestOf === 1 ? 'direct' : (match.bestOf === 3 ? 'bo3' : 'bo5')
  return (
    <VetoClient matchId={params.id} mode={mode} maps={maps} />
  )
} 