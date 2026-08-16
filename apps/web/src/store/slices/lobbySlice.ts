import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { rosterFromMembers } from '@/lib/teams'

export interface Member {
  id: string
  name: string
  odidUserId?: string
  role?: string
  team?: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface ChatLine {
  id: string
  userId: string
  name: string
  body: string
  createdAt: string
}

interface LobbyState {
  currentLobbyId: string | null
  connectionStatus: ConnectionStatus
  members: Member[]
  teamA: string[]
  teamB: string[]
  captainA: string | null
  captainB: string | null
  messages: ChatLine[]
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
  messages: [],
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
        applyMembers(state, action.payload.initialMembers)
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
      state.messages = []
      state.seq = 0
      state.error = null
    },
    connectionError: (state, action: PayloadAction<string>) => {
      state.connectionStatus = 'error'
      state.error = action.payload
    },

    // Members
    setMembers: (state, action: PayloadAction<Member[]>) => {
      applyMembers(state, action.payload)
    },
    applySnapshot: (state, action: PayloadAction<{
      members?: Member[]
      teamA?: string[]
      teamB?: string[]
      captainA?: string | null
      captainB?: string | null
    }>) => {
      if (action.payload.members) applyMembers(state, action.payload.members)
      if (action.payload.teamA) state.teamA = action.payload.teamA
      if (action.payload.teamB) state.teamB = action.payload.teamB
      if (action.payload.captainA) state.captainA = action.payload.captainA
      if (action.payload.captainB) state.captainB = action.payload.captainB
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
      state.captainA = action.payload.captainA
      state.captainB = action.payload.captainB
      if (!state.teamA.includes(action.payload.captainA)) state.teamA = [action.payload.captainA, ...state.teamA]
      if (!state.teamB.includes(action.payload.captainB)) state.teamB = [action.payload.captainB, ...state.teamB]
    },
    captainsSet: (state, action: PayloadAction<{ seq: number; captainA: string; captainB: string; teamA?: string[]; teamB?: string[] }>) => {
      if (action.payload.seq <= state.seq) return
      state.seq = action.payload.seq
      state.captainA = action.payload.captainA
      state.captainB = action.payload.captainB
      if (action.payload.teamA) state.teamA = action.payload.teamA
      else if (!state.teamA.includes(action.payload.captainA)) state.teamA = [action.payload.captainA, ...state.teamA]
      if (action.payload.teamB) state.teamB = action.payload.teamB
      else if (!state.teamB.includes(action.payload.captainB)) state.teamB = [action.payload.captainB, ...state.teamB]
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
    sendChat: (_state, _action: PayloadAction<{ body: string }>) => {
      // middleware invokes the hub
    },
    setChatHistory: (state, action: PayloadAction<ChatLine[]>) => {
      state.messages = action.payload
    },
    chatMessage: (state, action: PayloadAction<ChatLine>) => {
      if (state.messages.some((m) => m.id === action.payload.id)) return
      state.messages.push(action.payload)
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

function applyMembers(state: LobbyState, members: Member[]) {
  state.members = members
  const roster = rosterFromMembers(members)
  state.teamA = roster.teamA
  state.teamB = roster.teamB
  if (roster.captainA) state.captainA = roster.captainA
  if (roster.captainB) state.captainB = roster.captainB
}

export const {
  connect,
  connected,
  reconnecting,
  disconnect,
  disconnected,
  connectionError,
  setMembers,
  applySnapshot,
  userJoined,
  userLeft,
  setCaptains,
  captainsSet,
  updateTeams,
  teamsUpdated,
  sendChat,
  setChatHistory,
  chatMessage,
  setError,
  clearError,
} = lobbySlice.actions

export default lobbySlice.reducer
