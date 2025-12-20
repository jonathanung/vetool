import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface MapTile {
  id: string
  code: string
  name: string
}

export type VetoMode = 'bo1' | 'bo3' | 'bo5' | 'direct'
export type NextTeam = 'A' | 'B' | 'None'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface MatchState {
  currentMatchId: string | null
  connectionStatus: ConnectionStatus
  mode: VetoMode
  stepIndex: number
  nextTeam: NextTeam
  availableMaps: MapTile[]
  allMaps: MapTile[] // Original full list
  picks: string[]
  bans: string[]
  seq: number
  error: string | null
  isComplete: boolean
  countdownEndTime: number | null // Unix timestamp when countdown ends
}

const initialState: MatchState = {
  currentMatchId: null,
  connectionStatus: 'disconnected',
  mode: 'bo3',
  stepIndex: 0,
  nextTeam: 'A',
  availableMaps: [],
  allMaps: [],
  picks: [],
  bans: [],
  seq: 0,
  error: null,
  isComplete: false,
  countdownEndTime: null,
}

export const matchSlice = createSlice({
  name: 'match',
  initialState,
  reducers: {
    // Connection lifecycle
    connect: (state, action: PayloadAction<{ matchId: string; mode: VetoMode; maps: MapTile[] }>) => {
      state.currentMatchId = action.payload.matchId
      state.mode = action.payload.mode
      state.allMaps = action.payload.maps
      state.availableMaps = action.payload.maps
      state.connectionStatus = 'connecting'
      state.error = null
      state.isComplete = false
      state.picks = []
      state.bans = []
      state.stepIndex = 0
      state.nextTeam = 'A'
    },
    connected: (state) => {
      state.connectionStatus = 'connected'
    },
    reconnecting: (state) => {
      state.connectionStatus = 'reconnecting'
    },
    disconnect: (state) => {
      state.connectionStatus = 'disconnected'
    },
    disconnected: (state) => {
      state.currentMatchId = null
      state.connectionStatus = 'disconnected'
      state.availableMaps = []
      state.allMaps = []
      state.picks = []
      state.bans = []
      state.stepIndex = 0
      state.nextTeam = 'A'
      state.seq = 0
      state.error = null
      state.isComplete = false
      state.countdownEndTime = null
    },
    connectionError: (state, action: PayloadAction<string>) => {
      state.connectionStatus = 'error'
      state.error = action.payload
    },

    // Veto session events from server
    vetoSessionStarted: (state, action: PayloadAction<{
      seq: number
      available: string[]
      countdownMs?: number
    }>) => {
      state.seq = action.payload.seq
      // Map available IDs to full MapTile objects
      state.availableMaps = action.payload.available
        .map(id => state.allMaps.find(m => m.id === id))
        .filter((m): m is MapTile => m !== undefined)
      if (action.payload.countdownMs) {
        state.countdownEndTime = Date.now() + action.payload.countdownMs
      }
    },

    vetoProgress: (state, action: PayloadAction<{
      seq: number
      stepIndex: number
      team: NextTeam
      picks?: string[]
      bans?: string[]
      available?: string[]
      countdownMs?: number
    }>) => {
      if (action.payload.seq <= state.seq) return
      state.seq = action.payload.seq
      state.stepIndex = action.payload.stepIndex
      state.nextTeam = action.payload.team
      if (action.payload.picks) state.picks = action.payload.picks
      if (action.payload.bans) state.bans = action.payload.bans
      if (action.payload.available) {
        state.availableMaps = action.payload.available
          .map(id => state.allMaps.find(m => m.id === id))
          .filter((m): m is MapTile => m !== undefined)
      }
      if (action.payload.countdownMs) {
        state.countdownEndTime = Date.now() + action.payload.countdownMs
      }
    },

    vetoCompleted: (state, action: PayloadAction<{ seq: number; maps: string[] }>) => {
      if (action.payload.seq <= state.seq) return
      state.seq = action.payload.seq
      state.picks = action.payload.maps
      state.isComplete = true
      state.nextTeam = 'None'
      state.countdownEndTime = null
    },

    // Actions that trigger SignalR invocations (handled by middleware)
    ban: (state, action: PayloadAction<string>) => {
      // Optimistic update
      state.bans.push(action.payload)
      state.availableMaps = state.availableMaps.filter(m => m.id !== action.payload)
    },
    pick: (state, action: PayloadAction<string>) => {
      // Optimistic update
      state.picks.push(action.payload)
      state.availableMaps = state.availableMaps.filter(m => m.id !== action.payload)
    },

    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const {
  connect,
  connected,
  reconnecting,
  disconnect,
  disconnected,
  connectionError,
  vetoSessionStarted,
  vetoProgress,
  vetoCompleted,
  ban,
  pick,
  setError,
  clearError,
} = matchSlice.actions

export default matchSlice.reducer
