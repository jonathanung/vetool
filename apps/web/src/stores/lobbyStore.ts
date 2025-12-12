"use client"
import { create } from 'zustand'
import { connectLobbyHub } from '@/lib/signalr'

type EventEnvelope = { event: string; seq: number; occurredAt: string; payload: any }
type Member = { id: string; name: string }

async function fetchMembers(lobbyId: string): Promise<Member[]> {
  const res = await fetch(`/api/lobbies/${lobbyId}/members`, { credentials: 'include', cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return (data as any[]).map(m => ({ id: m.userId, name: m.displayName || m.userName || 'Player' }))
}

type LobbyState = {
  lobbyId: string | null
  seq: number
  teamA: string[]
  teamB: string[]
  members: Member[]
  connection: ReturnType<typeof connectLobbyHub> | null
  init: (lobbyId: string, initialMembers?: Member[]) => Promise<void>
  refreshMembers: () => Promise<void>
  setCaptains: (a: string, b: string) => Promise<void>
  updateTeams: (teamA: string[], teamB: string[]) => Promise<void>
  disconnect: () => Promise<void>
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  lobbyId: null,
  seq: 0,
  teamA: [],
  teamB: [],
  members: [],
  connection: null,
  async init(lobbyId: string, initialMembers?: Member[]) {
    if (get().connection && get().lobbyId === lobbyId) return
    if (initialMembers?.length) set({ members: initialMembers })

    const refreshMembers = async () => {
      const list = await fetchMembers(lobbyId)
      set({ members: list })
    }

    const conn = connectLobbyHub(lobbyId, async (evt: EventEnvelope) => {
      if (evt.seq <= get().seq) return
      if (evt.event === 'TeamsUpdated') {
        set({ seq: evt.seq, teamA: evt.payload.teamA, teamB: evt.payload.teamB })
      } else if (evt.event === 'UserJoined' || evt.event === 'UserLeft' || evt.event === 'CaptainsSet') {
        await refreshMembers()
        set({ seq: evt.seq })
      } else {
        set({ seq: evt.seq })
      }
    })
    await conn.start()
    set({ lobbyId, connection: conn, refreshMembers })
  },
  async refreshMembers() {
    const { lobbyId } = get()
    if (!lobbyId) return
    const list = await fetchMembers(lobbyId)
    set({ members: list })
  },
  async disconnect() {
    const { lobbyId, connection } = get()
    if (connection) {
      try { await connection.connection.stop() } catch {}
    }
    if (lobbyId) {
      try { await fetch(`/api/lobbies/${lobbyId}/leave`, { method: 'POST', credentials: 'include' }) } catch {}
    }
    set({ connection: null, lobbyId: null, members: [], teamA: [], teamB: [], seq: 0 })
  },
  async setCaptains(a: string, b: string) {
    const { lobbyId, connection } = get()
    if (!lobbyId || !connection) return
    await connection.connection.invoke('SetCaptains', lobbyId, a, b, crypto.randomUUID())
  },
  async updateTeams(teamA: string[], teamB: string[]) {
    const { lobbyId, connection } = get()
    if (!lobbyId || !connection) return
    await connection.connection.invoke('UpdateTeams', lobbyId, teamA, teamB, crypto.randomUUID())
  }
}))