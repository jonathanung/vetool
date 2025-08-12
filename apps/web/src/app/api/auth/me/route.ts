import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1'

export async function GET(_req: NextRequest) {
  const upstream = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
  })
  const raw = await upstream.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = raw }
  return NextResponse.json(data, { status: upstream.status })
} 