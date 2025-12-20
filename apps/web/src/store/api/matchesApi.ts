import { baseApi } from './baseApi'

export interface MapTile {
  id: string
  code: string
  name: string
}

export interface Match {
  id: string
  lobbyId: string
  status: string
  selectedMapId?: string
  teamAScore?: number
  teamBScore?: number
  createdAt: string
  updatedAt: string
  availableMaps?: MapTile[]
}

export const matchesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMatch: builder.query<Match, string>({
      query: (id) => `/matches/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Match', id }],
    }),

    getMatchMaps: builder.query<MapTile[], string>({
      query: (id) => `/matches/${id}/maps`,
      providesTags: (_result, _error, id) => [{ type: 'Match', id: `${id}-maps` }],
    }),
  }),
})

export const {
  useGetMatchQuery,
  useGetMatchMapsQuery,
} = matchesApi
