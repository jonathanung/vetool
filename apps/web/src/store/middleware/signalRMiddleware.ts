import { Middleware, Dispatch, UnknownAction } from '@reduxjs/toolkit'
import * as signalR from '@microsoft/signalr'
import { HUB_LOBBY_URL, HUB_VETO_URL } from '@/lib/config'

type AppDispatch = Dispatch<UnknownAction>
import {
  connect as lobbyConnect,
  connected as lobbyConnected,
  reconnecting as lobbyReconnecting,
  disconnect as lobbyDisconnect,
  disconnected as lobbyDisconnected,
  connectionError as lobbyConnectionError,
  setMembers,
  userJoined,
  userLeft,
  setCaptains,
  captainsSet,
  updateTeams,
  teamsUpdated,
  setError as setLobbyError,
  type Member,
} from '../slices/lobbySlice'
import {
  connect as matchConnect,
  connected as matchConnected,
  reconnecting as matchReconnecting,
  disconnect as matchDisconnect,
  disconnected as matchDisconnected,
  connectionError as matchConnectionError,
  vetoSessionStarted,
  vetoProgress,
  vetoCompleted,
  ban,
  pick,
  setError as setMatchError,
} from '../slices/matchSlice'
import { addToast } from '../slices/uiSlice'

// Connection references (managed outside Redux state)
let lobbyConnection: signalR.HubConnection | null = null
let vetoConnection: signalR.HubConnection | null = null

// Helper to fetch lobby members
async function fetchLobbyMembers(lobbyId: string): Promise<Member[]> {
  try {
    const res = await fetch(`/api/lobbies/${lobbyId}/members`, {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data as Array<{ userId?: string; id?: string; displayName?: string; userName?: string; role?: Member['role']; team?: Member['team'] }>).map((m) => ({
      id: m.userId || m.id || '',
      name: m.displayName || m.userName || 'Player',
      role: m.role,
      team: m.team,
    }))
  } catch {
    return []
  }
}

// Async handler for lobby connection
async function handleLobbyConnect(
  lobbyId: string,
  initialMembers: Member[] | undefined,
  dispatch: AppDispatch
) {
  // Cleanup existing connection if any
  if (lobbyConnection) {
    try {
      await lobbyConnection.stop()
    } catch {
      // Ignore cleanup errors
    }
    lobbyConnection = null
  }

  // Create new connection
  lobbyConnection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_LOBBY_URL, { withCredentials: true })
    .withAutomaticReconnect()
    .build()

  // Register event handlers
  lobbyConnection.on('UserJoined', async (evt: { seq?: number; payload?: { userId?: string; displayName?: string } }) => {
    const members = await fetchLobbyMembers(lobbyId)
    dispatch(setMembers(members))
    if (evt.seq) {
      dispatch(userJoined({ seq: evt.seq, member: { id: evt.payload?.userId || '', name: evt.payload?.displayName || 'Player' } }))
    }
  })

  lobbyConnection.on('UserLeft', async (evt: { seq?: number; payload?: { userId?: string } }) => {
    const members = await fetchLobbyMembers(lobbyId)
    dispatch(setMembers(members))
    if (evt.seq && evt.payload?.userId) {
      dispatch(userLeft({ seq: evt.seq, odidUserId: evt.payload.userId }))
    }
  })

  lobbyConnection.on('CaptainsSet', async (evt: { seq?: number; payload?: { captainA?: string; captainB?: string } }) => {
    const members = await fetchLobbyMembers(lobbyId)
    dispatch(setMembers(members))
    if (evt.seq && evt.payload) {
      dispatch(captainsSet({
        seq: evt.seq,
        captainA: evt.payload.captainA || '',
        captainB: evt.payload.captainB || '',
      }))
    }
  })

  lobbyConnection.on('TeamsUpdated', (evt: { seq?: number; payload?: { teamA?: string[]; teamB?: string[] } }) => {
    if (evt.seq && evt.payload) {
      dispatch(teamsUpdated({
        seq: evt.seq,
        teamA: evt.payload.teamA || [],
        teamB: evt.payload.teamB || [],
      }))
    }
  })

  lobbyConnection.on('Error', (evt: { payload?: { message?: string }; message?: string }) => {
    const message = evt.payload?.message || evt.message || 'An error occurred'
    dispatch(setLobbyError(message))
    dispatch(addToast({ type: 'error', message }))
  })

  lobbyConnection.onreconnecting(() => {
    dispatch(lobbyReconnecting())
  })

  lobbyConnection.onreconnected(() => {
    dispatch(lobbyConnected())
    lobbyConnection?.invoke('JoinLobby', lobbyId).catch(() => {})
  })

  lobbyConnection.onclose(() => {
    dispatch(lobbyDisconnected())
  })

  // Start connection
  try {
    await lobbyConnection.start()
    await lobbyConnection.invoke('JoinLobby', lobbyId)
    dispatch(lobbyConnected())

    if (initialMembers?.length) {
      dispatch(setMembers(initialMembers))
    } else {
      const members = await fetchLobbyMembers(lobbyId)
      dispatch(setMembers(members))
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to lobby'
    dispatch(lobbyConnectionError(message))
    dispatch(addToast({ type: 'error', message: `Connection failed: ${message}` }))
  }
}

// Async handler for lobby disconnect
async function handleLobbyDisconnect(lobbyId: string | null, dispatch: AppDispatch) {
  if (lobbyConnection) {
    try {
      if (lobbyId) {
        await lobbyConnection.invoke('LeaveLobby', lobbyId)
      }
      await lobbyConnection.stop()
    } catch {
      // Ignore cleanup errors
    }
    lobbyConnection = null
  }

  if (lobbyId) {
    try {
      await fetch(`/api/lobbies/${lobbyId}/leave`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore API errors on leave
    }
  }

  dispatch(lobbyDisconnected())
}

// Async handler for set captains
async function handleSetCaptains(lobbyId: string, captainA: string, captainB: string, dispatch: AppDispatch) {
  if (lobbyConnection && lobbyId) {
    try {
      await lobbyConnection.invoke('SetCaptains', lobbyId, captainA, captainB, crypto.randomUUID())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set captains'
      dispatch(setLobbyError(message))
      dispatch(addToast({ type: 'error', message }))
    }
  }
}

// Async handler for update teams
async function handleUpdateTeams(lobbyId: string, teamA: string[], teamB: string[], dispatch: AppDispatch) {
  if (lobbyConnection && lobbyId) {
    try {
      await lobbyConnection.invoke('UpdateTeams', lobbyId, teamA, teamB, crypto.randomUUID())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update teams'
      dispatch(setLobbyError(message))
      dispatch(addToast({ type: 'error', message }))
    }
  }
}

// Async handler for match connection
async function handleMatchConnect(
  matchId: string,
  mode: string,
  dispatch: AppDispatch
) {
  if (vetoConnection) {
    try {
      await vetoConnection.stop()
    } catch {
      // Ignore cleanup errors
    }
    vetoConnection = null
  }

  vetoConnection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_VETO_URL, { withCredentials: true })
    .withAutomaticReconnect()
    .build()

  vetoConnection.on('VetoSessionStarted', (evt: { seq?: number; payload?: { available?: string[]; countdownMs?: number } }) => {
    dispatch(vetoSessionStarted({
      seq: evt.seq || 0,
      available: evt.payload?.available || [],
      countdownMs: evt.payload?.countdownMs,
    }))
  })

  vetoConnection.on('VetoProgress', (evt: { seq?: number; payload?: { stepIndex?: number; team?: 'A' | 'B' | 'None'; picks?: string[]; bans?: string[]; available?: string[]; countdownMs?: number } }) => {
    if (evt.seq && evt.payload) {
      dispatch(vetoProgress({
        seq: evt.seq,
        stepIndex: evt.payload.stepIndex ?? 0,
        team: evt.payload.team ?? 'A',
        picks: evt.payload.picks,
        bans: evt.payload.bans,
        available: evt.payload.available,
        countdownMs: evt.payload.countdownMs,
      }))
    }
  })

  vetoConnection.on('VetoCompleted', (evt: { seq?: number; payload?: { maps?: string[] } }) => {
    if (evt.seq && evt.payload) {
      dispatch(vetoCompleted({
        seq: evt.seq,
        maps: evt.payload.maps || [],
      }))
      dispatch(addToast({ type: 'success', message: 'Map veto completed!' }))
    }
  })

  vetoConnection.on('Error', (evt: { payload?: { message?: string }; message?: string }) => {
    const message = evt.payload?.message || evt.message || 'Veto error occurred'
    dispatch(setMatchError(message))
    dispatch(addToast({ type: 'error', message }))
  })

  vetoConnection.onreconnecting(() => {
    dispatch(matchReconnecting())
  })

  vetoConnection.onreconnected(() => {
    dispatch(matchConnected())
    vetoConnection?.invoke('JoinMatch', matchId).catch(() => {})
  })

  vetoConnection.onclose(() => {
    dispatch(matchDisconnected())
  })

  try {
    await vetoConnection.start()
    await vetoConnection.invoke('JoinMatch', matchId)
    dispatch(matchConnected())
    await vetoConnection.invoke('StartVeto', matchId, mode)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to match'
    dispatch(matchConnectionError(message))
    dispatch(addToast({ type: 'error', message: `Veto connection failed: ${message}` }))
  }
}

// Async handler for match disconnect
async function handleMatchDisconnect(matchId: string | null, dispatch: AppDispatch) {
  if (vetoConnection) {
    try {
      if (matchId) {
        await vetoConnection.invoke('LeaveMatch', matchId)
      }
      await vetoConnection.stop()
    } catch {
      // Ignore cleanup errors
    }
    vetoConnection = null
  }

  dispatch(matchDisconnected())
}

// Async handler for veto actions
async function handleVetoAction(matchId: string, actionType: 'ban' | 'pick', mapId: string, dispatch: AppDispatch) {
  if (vetoConnection && matchId) {
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    try {
      await vetoConnection.invoke('VetoAction', matchId, actionType, mapId, clientRequestId)
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${actionType} map`
      dispatch(setMatchError(message))
      dispatch(addToast({ type: 'error', message }))
    }
  }
}

// The middleware
export const signalRMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action)
  const dispatch = store.dispatch

  // Handle actions asynchronously using void to ignore the promise
  if (lobbyConnect.match(action)) {
    const { lobbyId, initialMembers } = action.payload
    void handleLobbyConnect(lobbyId, initialMembers, dispatch)
  }

  if (lobbyDisconnect.match(action)) {
    const state = store.getState() as { lobby: { currentLobbyId: string | null } }
    void handleLobbyDisconnect(state.lobby.currentLobbyId, dispatch)
  }

  if (setCaptains.match(action)) {
    const { captainA, captainB } = action.payload
    const state = store.getState() as { lobby: { currentLobbyId: string | null } }
    if (state.lobby.currentLobbyId) {
      void handleSetCaptains(state.lobby.currentLobbyId, captainA, captainB, dispatch)
    }
  }

  if (updateTeams.match(action)) {
    const { teamA, teamB } = action.payload
    const state = store.getState() as { lobby: { currentLobbyId: string | null } }
    if (state.lobby.currentLobbyId) {
      void handleUpdateTeams(state.lobby.currentLobbyId, teamA, teamB, dispatch)
    }
  }

  if (matchConnect.match(action)) {
    const { matchId, mode } = action.payload
    void handleMatchConnect(matchId, mode, dispatch)
  }

  if (matchDisconnect.match(action)) {
    const state = store.getState() as { match: { currentMatchId: string | null } }
    void handleMatchDisconnect(state.match.currentMatchId, dispatch)
  }

  if (ban.match(action)) {
    const mapId = action.payload
    const state = store.getState() as { match: { currentMatchId: string | null } }
    if (state.match.currentMatchId) {
      void handleVetoAction(state.match.currentMatchId, 'ban', mapId, dispatch)
    }
  }

  if (pick.match(action)) {
    const mapId = action.payload
    const state = store.getState() as { match: { currentMatchId: string | null } }
    if (state.match.currentMatchId) {
      void handleVetoAction(state.match.currentMatchId, 'pick', mapId, dispatch)
    }
  }

  return result
}

export default signalRMiddleware
