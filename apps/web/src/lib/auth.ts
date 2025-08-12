import { cookies } from 'next/headers'

export type Me = { id: string; userName: string; displayName: string; email: string; avatarUrl?: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1'

export async function getMe(): Promise<Me | null> {
  try {
    const cookieHeader = cookies().getAll().map(c => `${c.name}=${c.value}`).join('; ')
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: 'no-store',
      // credentials has no effect in Node, header above forwards auth
    })
    if (!res.ok) return null
    const me = await res.json()
    return me as Me
  } catch {
    return null
  }
} 