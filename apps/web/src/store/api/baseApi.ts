import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
// Same-origin so a remote browser does not call localhost on the client machine.
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Auth', 'Lobbies', 'Lobby', 'LobbyMembers', 'Matches', 'Match'],
  endpoints: () => ({}),
})
