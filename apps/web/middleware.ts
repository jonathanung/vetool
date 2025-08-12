import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = [/^\/lobbies/, /^\/matches/, /^\/account/]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Allow SignalR hubs and Next internals without auth checks
  if (pathname.startsWith('/hubs')) return NextResponse.next()

  const isProtected = PROTECTED.some(r => r.test(pathname))
  if (!isProtected) return NextResponse.next()

  const origin = req.nextUrl.origin
  const meRes = await fetch(`${origin}/api/auth/me`, { headers: { cookie: req.headers.get('cookie') || '' } })
  if (meRes.ok) return NextResponse.next()
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next|api/static|static|favicon.ico).*)'],
} 