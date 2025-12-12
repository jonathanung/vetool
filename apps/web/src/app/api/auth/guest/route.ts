import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/config'

export async function POST(req: NextRequest) {
  const upstream = await fetch(`${API_BASE}/auth/guest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    credentials: 'include',
  })

  const raw = await upstream.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = raw }

  const res = NextResponse.json(data, { status: upstream.status })

  if (upstream.ok) {
    const setCookieHeaders = upstream.headers.getSetCookie()
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookieString => {
        res.headers.append('set-cookie', cookieString)
      })
    }
  }

  return res
}
