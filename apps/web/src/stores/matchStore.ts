"use client"
import { create } from 'zustand'
import { connectVetoHub } from '@/lib/signalr'

type EventEnvelope = { event: string; seq: number; occurredAt: string; payload: any }

type MapTile = { id: string; code: string; name: string }

type MatchState = {
  matchId: string | null
  seq: number
  mode: 'bo1' | 'bo3' | 'bo5' | 'direct'
  stepIndex: number
  nextTeam: 'A' | 'B' | 'None'
  availableMaps: MapTile[]
  picks: string[]
  bans: string[]
  connection: ReturnType<typeof connectVetoHub> | null
  init: (matchId: string, mode: MatchState['mode'], maps: MatchState['availableMaps']) => Promise<void>
  ban: (mapId: string) => Promise<void>
  pick: (mapId: string) => Promise<void>
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matchId: null,
  seq: 0,
  mode: 'bo3',
  stepIndex: 0,
  nextTeam: 'A',
  availableMaps: [],
  picks: [],
  bans: [],
  connection: null,
  async init(matchId, mode, maps) {
    if (get().connection && get().matchId === matchId) return
    set({ matchId, mode, availableMaps: maps })
    const handlers: Record<string, (e: any)=>void> = {
      VetoSessionStarted: (evt: EventEnvelope) => {
        set({ seq: evt.seq, availableMaps: (evt.payload.available || []).map((id: string) => {
          const found = maps.find(m => m.id === id)
          return found ?? { id, code: id.slice(0,6), name: id }
        }) })
      },
      VetoProgress: (evt: EventEnvelope) => {
        if (evt.seq <= get().seq) return
        set({ seq: evt.seq, stepIndex: evt.payload.stepIndex, nextTeam: evt.payload.team, picks: evt.payload.picks ?? get().picks, bans: evt.payload.bans ?? get().bans })
      },
      VetoCompleted: (evt: EventEnvelope) => {
        if (evt.seq <= get().seq) return
        set({ seq: evt.seq, picks: evt.payload.maps })
      },
      Error: (evt: EventEnvelope) => { console.error(evt) }
    }
    const conn = connectVetoHub(matchId, handlers)
    await conn.start()
    set({ connection: conn })
    // kick off veto session
    await conn.connection.invoke('StartVeto', matchId, mode)
  },
  async ban(mapId) {
    const conn = get().connection?.connection
    if (!conn) return
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    await conn.invoke('VetoAction', get().matchId, 'ban', mapId, clientRequestId)
  },
  async pick(mapId) {
    const conn = get().connection?.connection
    if (!conn) return
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    await conn.invoke('VetoAction', get().matchId, 'pick', mapId, clientRequestId)
  }
})) 