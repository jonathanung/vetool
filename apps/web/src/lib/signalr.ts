"use client"
import * as signalR from '@microsoft/signalr'
import { HUB_LOBBY_URL, HUB_VETO_URL } from './config'

export function connectLobbyHub(lobbyId: string, onEvent: (event: any) => void) {
  const hubUrl = HUB_LOBBY_URL
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, { withCredentials: true })
    .withAutomaticReconnect()
    .build()

  connection.on('UserJoined', onEvent)
  connection.on('UserLeft', onEvent)
  connection.on('CaptainsSet', onEvent)
  connection.on('TeamsUpdated', onEvent)
  connection.on('Error', onEvent)

  async function start() {
    if (connection.state === signalR.HubConnectionState.Connected) return
    await connection.start()
    await connection.invoke('JoinLobby', lobbyId)
  }

  return { connection, start }
}

export function connectVetoHub(matchId: string, handlers: Record<string, (e: any)=>void>) {
  const hubUrl = HUB_VETO_URL
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, { withCredentials: true })
    .withAutomaticReconnect()
    .build()

  for (const [evt, cb] of Object.entries(handlers)) {
    connection.on(evt, cb)
  }

  async function start() {
    if (connection.state === signalR.HubConnectionState.Connected) return
    await connection.start()
    await connection.invoke('JoinMatch', matchId)
  }

  return { connection, start }
} 