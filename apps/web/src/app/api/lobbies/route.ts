import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/config'

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') || ''
  const qs = req.nextUrl.searchParams.toString()
  const upstream = await fetch(`${API_BASE}/lobbies${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: {
      ...(cookie ? { cookie } : {}),
    },
    credentials: 'include',
  })

  const raw = await upstream.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = raw }
  return NextResponse.json(data, { status: upstream.status })
}

export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie') || ''
  const body = await req.text()
  const upstream = await fetch(`${API_BASE}/lobbies`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body,
    credentials: 'include',
  })

  const raw = await upstream.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = raw }
  return NextResponse.json(data, { status: upstream.status })
}

export async function DELETE(req: NextRequest) {
  const cookie = req.headers.get('cookie') || ''
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 })
  const upstream = await fetch(`${API_BASE}/lobbies/${id}`, {
    method: 'DELETE',
    headers: {
      ...(cookie ? { cookie } : {}),
    },
    credentials: 'include',
  })

  const raw = await upstream.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch { data = raw }
  return NextResponse.json(data, { status: upstream.status })
}
