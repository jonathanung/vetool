import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Member {
  id: string
  name: string
  odidUserId?: string
  role?: 'Owner' | 'Captain' | 'Player'
  team?: 'A' | 'B' | 'None'
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

interface LobbyState {
  currentLobbyId: string | null
  connectionStatus: ConnectionStatus
  members: Member[]
  teamA: string[]
  teamB: string[]
  captainA: string | null
  captainB: string | null
  seq: number
  error: string | null
}

const initialState: LobbyState = {
  currentLobbyId: null,
  connectionStatus: 'disconnected',
  members: [],
  teamA: [],
  teamB: [],
  captainA: null,
  captainB: null,
  seq: 0,
  error: null,
}

export const lobbySlice = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    // Connection lifecycle
    connect: (state, action: PayloadAction<{ lobbyId: string; initialMembers?: Member[] }>) => {
      state.currentLobbyId = action.payload.lobbyId
      state.connectionStatus = 'connecting'
      state.error = null
      if (action.payload.initialMembers) {
        state.members = action.payload.initialMembers
      }
    },
    connected: (state) => {
      state.connectionStatus = 'connected'
    },
    reconnecting: (state) => {
      state.connectionStatus = 'reconnecting'
    },
    disconnect: (state) => {
      // Middleware will handle actual disconnection
      state.connectionStatus = 'disconnected'
    },
    disconnected: (state) => {
      state.currentLobbyId = null
      state.connectionStatus = 'disconnected'
      state.members = []
      state.teamA = []
      state.teamB = []
      state.captainA = null
      state.captainB = null
      state.seq = 0
      state.error = null
    },
    connectionError: (state, action: PayloadAction<string>) => {
      state.connectionStatus = 'error'
      state.error = action.payload
    },

    // Members
    setMembers: (state, action: PayloadAction<Member[]>) => {
      state.members = action.payload
    },
    userJoined: (state, action: PayloadAction<{ seq: number; member: Member }>) => {
      if (action.payload.seq <= state.seq) return
      state.seq = action.payload.seq
      const exists = state.members.find(m => m.id === action.payload.member.id)
      if (!exists) {
        state.members.push(action.payload.member)
      }
    },
    userLeft: (state, action: PayloadAction<{ seq: number; odidUserId: string }>) => {
      if (action.payload.seq <= state.seq) return
      state.seq = action.payload.seq
      state.members = state.members.filter(m => m.id !== action.payload.odidUserId)
      state.teamA = state.teamA.filter(id => id !== action.payload.odidUserId)
      state.teamB = state.teamB.filter(id => id !== action.payload.odidUserId)
    },

    // Captains - actions that trigger SignalR invocations
    setCaptains: (state, action: PayloadAction<{ captainA: string; captainB: string }>) => {
      // Optimistic update - will be confirmed by SignalR event
      state.captainA = action.payload.captainA
      state.captainB = action.payload.captainB
    },
    captainsSet: (state, action: PayloadAction<{ seq: number; captainA: string; captainB: string }>) => {
      if (action.payload.seq <= state.seq) return
      state.seq = action.payload.seq
      state.captainA = action.payload.captainA
      state.captainB = action.payload.captainB
    },

    // Teams - actions that trigger SignalR invocations
    updateTeams: (state, action: PayloadAction<{ teamA: string[]; teamB: string[] }>) => {
      // Optimistic update
      state.teamA = action.payload.teamA
      state.teamB = action.payload.teamB
    },
    teamsUpdated: (state, action: PayloadAction<{ seq: number; teamA: string[]; teamB: string[] }>) => {
      if (action.payload.seq <= state.seq) return
      state.seq = action.payload.seq
      state.teamA = action.payload.teamA
      state.teamB = action.payload.teamB
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
  setMembers,
  userJoined,
  userLeft,
  setCaptains,
  captainsSet,
  updateTeams,
  teamsUpdated,
  setError,
  clearError,
} = lobbySlice.actions

export default lobbySlice.reducer
