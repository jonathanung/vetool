import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1'

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
    res.cookies.delete(process.env.NEXT_PUBLIC_JWT_COOKIE_NAME || 'vetool_jwt')
  }

  return res
} 