import { API_BASE } from './config'

export class ApiError extends Error {
  status: number
  constructor(status: number, message?: string) {
    super(message || `API ${status}`)
    this.status = status
  }
}

// Client-side API request function
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    credentials: 'include',
  })
  
  if (!res.ok) {
    throw new ApiError(res.status)
  }
  
  return res.json()
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, { ...init, method: 'GET' })
}

export async function apiPost<T>(path: string, body: any, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: 'POST',
    body: JSON.stringify(body),
  })
} 