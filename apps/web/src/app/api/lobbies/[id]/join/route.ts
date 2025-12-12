import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/config'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookie = req.headers.get('cookie') || ''
  const upstream = await fetch(`${API_BASE}/lobbies/${params.id}/join`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    credentials: 'include',
  })

  const bodyText = await upstream.text()
  let body: any = null
  try { body = JSON.parse(bodyText) } catch { body = bodyText || { ok: upstream.ok } }

  return NextResponse.json(body, { status: upstream.status })
}
