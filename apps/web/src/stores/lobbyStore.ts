"use client"
import { create } from 'zustand'
import { connectLobbyHub } from '@/lib/signalr'

type EventEnvelope = { event: string; seq: number; occurredAt: string; payload: any }

type LobbyState = {
  lobbyId: string | null
  seq: number
  teamA: string[]
  teamB: string[]
  connection: ReturnType<typeof connectLobbyHub> | null
  init: (lobbyId: string) => Promise<void>
  setCaptains: (a: string, b: string) => Promise<void>
  updateTeams: (teamA: string[], teamB: string[]) => Promise<void>
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  lobbyId: null,
  seq: 0,
  teamA: [],
  teamB: [],
  connection: null,
  async init(lobbyId: string) {
    if (get().connection && get().lobbyId === lobbyId) return
    const conn = connectLobbyHub(lobbyId, (evt: EventEnvelope) => {
      if (evt.seq <= get().seq) return
      if (evt.event === 'TeamsUpdated') {
        set({ seq: evt.seq, teamA: evt.payload.teamA, teamB: evt.payload.teamB })
      } else {
        set({ seq: evt.seq })
      }
    })
    await conn.start()
    set({ lobbyId, connection: conn })
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