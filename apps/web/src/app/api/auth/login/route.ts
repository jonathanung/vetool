import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1'

export async function POST(req: NextRequest) {
  const body = await req.text()
  
  // Make request to backend API
  const upstream = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 
      'content-type': 'application/json',
    },
    body,
    credentials: 'include',
  })

  const raw = await upstream.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = raw }
  
  const res = NextResponse.json(data, { status: upstream.status })

  if (upstream.ok) {
    // Forward all Set-Cookie headers from upstream
    const setCookieHeaders = upstream.headers.getSetCookie()
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookieString => {
        res.headers.append('set-cookie', cookieString)
      })
    }
    // Best-effort: also set cookie via cookies API to survive edge runtime quirks
    const cookie = setCookieHeaders?.[0]
    if (cookie) {
      const simpleMatch = cookie.match(/^([^=;]+)=([^;]+)/)
      if (simpleMatch) {
        const name = simpleMatch[1]
        const value = simpleMatch[2]
        res.cookies.set(name, value, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
      }
    }
  }

  return res
} 