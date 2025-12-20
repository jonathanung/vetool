import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface UIState {
  toasts: Toast[]
  globalLoading: boolean
}

const initialState: UIState = {
  toasts: [],
  globalLoading: false,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      state.toasts.push({ ...action.payload, id })
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload)
    },
    clearToasts: (state) => {
      state.toasts = []
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload
    },
  },
})

export const {
  addToast,
  removeToast,
  clearToasts,
  setGlobalLoading,
} = uiSlice.actions

// Helper action creators
export const showSuccess = (message: string) => addToast({ type: 'success', message })
export const showError = (message: string) => addToast({ type: 'error', message })
export const showInfo = (message: string) => addToast({ type: 'info', message })
export const showWarning = (message: string) => addToast({ type: 'warning', message })

export default uiSlice.reducer
