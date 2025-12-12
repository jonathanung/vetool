import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/config'

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') || ''
  const upstream = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
  })
  const raw = await upstream.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = raw }
  return NextResponse.json(data, { status: upstream.status })
}