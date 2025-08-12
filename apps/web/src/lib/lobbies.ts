import { apiGet } from '@/lib/api'

export type Lobby = { id: string; name: string; game: string; status: string }
export type LobbyMember = { userId: string; userName: string; displayName: string; role: string; team: string }

export async function getLobby(id: string): Promise<Lobby> {
  return apiGet<Lobby>(`/lobbies/${id}`)
}

export async function getLobbyMembers(id: string): Promise<LobbyMember[]> {
  return apiGet<LobbyMember[]>(`/lobbies/${id}/members`)
} 