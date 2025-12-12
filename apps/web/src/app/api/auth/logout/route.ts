import { NextRequest, NextResponse } from 'next/server'
import { API_BASE, JWT_COOKIE_NAME } from '@/lib/config'

export async function POST(req: NextRequest) {
  const upstream = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'cookie': req.headers.get('cookie') || '',
    },
    credentials: 'include',
  })

  const res = NextResponse.json({ success: upstream.ok }, { status: upstream.status })

  if (upstream.ok) {
    // Forward all Set-Cookie headers from upstream (including cookie deletion)
    const setCookieHeaders = upstream.headers.getSetCookie()
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookieString => {
        res.headers.append('set-cookie', cookieString)
      })
    }
    // Also delete via Next cookies API for safety (name must match backend)
    res.cookies.delete(JWT_COOKIE_NAME)
  }

  return res
} 