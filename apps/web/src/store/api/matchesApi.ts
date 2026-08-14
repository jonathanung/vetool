import { baseApi } from './baseApi'

export interface MapTile {
  id: string
  code: string
  name: string
}

export interface RosterPlayer {
  userId: string
  userName: string
  displayName?: string
  role: string
  team: string
}

export interface VetoView {
  mode: string
  stepIndex: number
  nextTeam: string
  nextAction?: string | null
  isComplete: boolean
  available: string[]
  picks: string[]
  bans: string[]
}

export interface Match {
  id: string
  lobbyId: string
  bestOf: number
  game: string
  status: string
  joinDetails?: string | null
  maps: MapTile[]
  selectedMaps: MapTile[]
  teamA: RosterPlayer[]
  teamB: RosterPlayer[]
  veto?: VetoView | null
}

export const matchesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMatch: builder.query<Match, string>({
      query: (id) => `/matches/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Match', id }],
    }),

    setJoinDetails: builder.mutation<Match, { matchId: string; joinDetails: string }>({
      query: ({ matchId, joinDetails }) => ({
        url: `/matches/${matchId}/join-details`,
        method: 'PUT',
        body: { joinDetails },
      }),
      invalidatesTags: (_result, _error, { matchId }) => [{ type: 'Match', id: matchId }],
    }),

    startVeto: builder.mutation<Match, { matchId: string; mode?: string }>({
      query: ({ matchId, mode }) => ({
        url: `/matches/${matchId}/veto/start`,
        method: 'POST',
        body: { mode },
      }),
      invalidatesTags: (_result, _error, { matchId }) => [{ type: 'Match', id: matchId }],
    }),
  }),
})

export const {
  useGetMatchQuery,
  useSetJoinDetailsMutation,
  useStartVetoMutation,
} = matchesApi
