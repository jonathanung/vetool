import { configureStore, Middleware } from '@reduxjs/toolkit'
import { baseApi } from './api/baseApi'
import lobbyReducer from './slices/lobbySlice'
import matchReducer from './slices/matchSlice'
import uiReducer from './slices/uiSlice'

// Define reducer structure for type inference
const reducer = {
  [baseApi.reducerPath]: baseApi.reducer,
  lobby: lobbyReducer,
  match: matchReducer,
  ui: uiReducer,
}

// Infer RootState from reducer (avoids circular reference)
export type RootState = {
  [baseApi.reducerPath]: ReturnType<typeof baseApi.reducer>
  lobby: ReturnType<typeof lobbyReducer>
  match: ReturnType<typeof matchReducer>
  ui: ReturnType<typeof uiReducer>
}

// Import middleware after defining RootState
import { signalRMiddleware } from './middleware/signalRMiddleware'

export const makeStore = () => {
  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these paths in serialization check (SignalR connection objects)
          ignoredActions: ['lobby/connect', 'match/connect'],
        },
      })
        .concat(baseApi.middleware)
        .concat(signalRMiddleware as Middleware),
    devTools: process.env.NODE_ENV !== 'production',
  })
}

// Infer types from the store
export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
