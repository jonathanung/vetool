import { baseApi } from './baseApi'

export interface User {
  id: string
  userName: string
  displayName: string
  email: string
  avatarUrl?: string
  isGuest?: boolean
}

export interface LoginRequest {
  usernameOrEmail: string
  password: string
}

export interface RegisterRequest {
  userName: string
  email: string
  password: string
  displayName?: string
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<User | null, void>({
      // Handle 401 gracefully - user not logged in returns null
      async queryFn(_arg, _queryApi, _extraOptions, baseQuery) {
        const result = await baseQuery('/auth/me')
        if (result.error) {
          // Not authenticated - return null instead of error
          return { data: null }
        }
        return { data: result.data as User }
      },
      providesTags: ['Auth'],
    }),

    login: builder.mutation<User, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'Lobbies'],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'Lobbies', 'Lobby'],
    }),

    register: builder.mutation<User, RegisterRequest>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    createGuest: builder.mutation<{ token: string; user: User }, void>({
      query: () => ({
        url: '/auth/guest',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
})

export const {
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useCreateGuestMutation,
} = authApi
