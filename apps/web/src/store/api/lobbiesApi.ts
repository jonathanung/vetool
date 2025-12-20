import { baseApi } from './baseApi'

export interface Lobby {
  id: string
  name: string
  game: string
  status: string
  maxPlayers: number
  isPublic: boolean
  isMine?: boolean
  createdByUserId: string
}

export interface LobbyMember {
  id: string
  odidUserId: string
  userName: string
  displayName?: string
  role: 'Owner' | 'Captain' | 'Player'
  team: 'A' | 'B' | 'None'
}

export interface CreateLobbyRequest {
  name: string
  game: number | string  // 0 = Cs2, 1 = Val
  maxPlayers?: number
  isPublic?: boolean
}

// Map game string to enum value for backend
export const GAME_ENUM: Record<string, number> = {
  cs2: 0,
  val: 1,
}

export const lobbiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLobbies: builder.query<Lobby[], { game?: string; mine?: boolean }>({
      query: ({ game, mine }) => {
        const params = new URLSearchParams()
        if (game) params.set('game', game)
        if (mine) params.set('mine', 'true')
        return `/lobbies?${params.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Lobbies' as const, id })),
              { type: 'Lobbies', id: 'LIST' },
            ]
          : [{ type: 'Lobbies', id: 'LIST' }],
    }),

    getMyLobby: builder.query<Lobby | null, void>({
      query: () => '/lobbies?mine=true',
      providesTags: [{ type: 'Lobby', id: 'MINE' }],
      transformResponse: (response: Lobby[]) => {
        const mine = response.find((l) => l.isMine)
        return mine || null
      },
    }),

    getLobby: builder.query<Lobby, string>({
      query: (id) => `/lobbies/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Lobby', id }],
    }),

    getLobbyMembers: builder.query<LobbyMember[], string>({
      query: (id) => `/lobbies/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: 'LobbyMembers', id }],
    }),

    createLobby: builder.mutation<Lobby, CreateLobbyRequest>({
      query: (data) => ({
        url: '/lobbies',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Lobbies', id: 'LIST' }, { type: 'Lobby', id: 'MINE' }],
    }),

    deleteLobby: builder.mutation<void, string>({
      query: (id) => ({
        url: `/lobbies/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Lobbies', id: 'LIST' },
        { type: 'Lobby', id },
        { type: 'Lobby', id: 'MINE' },
      ],
    }),

    joinLobby: builder.mutation<{ joined: boolean }, string>({
      query: (id) => ({
        url: `/lobbies/${id}/join`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'LobbyMembers', id },
        { type: 'Lobby', id },
      ],
    }),

    joinAsGuest: builder.mutation<{ token: string; userId: string }, string>({
      query: (id) => ({
        url: `/lobbies/${id}/guest`,
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    leaveLobby: builder.mutation<void, string>({
      query: (id) => ({
        url: `/lobbies/${id}/leave`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'LobbyMembers', id },
        { type: 'Lobby', id },
      ],
    }),
  }),
})

export const {
  useGetLobbiesQuery,
  useGetMyLobbyQuery,
  useGetLobbyQuery,
  useGetLobbyMembersQuery,
  useCreateLobbyMutation,
  useDeleteLobbyMutation,
  useJoinLobbyMutation,
  useJoinAsGuestMutation,
  useLeaveLobbyMutation,
} = lobbiesApi
