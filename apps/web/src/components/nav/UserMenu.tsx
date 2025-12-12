"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Me = { id: string; userName: string; displayName: string; email: string; avatarUrl?: string }

export default function UserMenu() {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [myLobbyId, setMyLobbyId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return
        setMe(data)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [pathname])

  useEffect(() => {
    let active = true
    async function loadMyLobby() {
      if (!me) { setMyLobbyId(null); return }
      try {
        const res = await fetch('/api/lobbies?mine=true', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) { setMyLobbyId(null); return }
        const data = await res.json()
        const mine = (data as any[]).find((l: any) => l.isMine || l.IsMine)
        const id = mine?.id || mine?.Id
        if (active) setMyLobbyId(id || null)
      } catch {
        if (active) setMyLobbyId(null)
      }
    }
    loadMyLobby()
    return () => { active = false }
  }, [me])

  if (loading) return <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />

  return me ? (
    <div className="flex items-center gap-3">
      {myLobbyId && <Link href={`/lobbies/${myLobbyId}`} className="text-xs underline">My lobby</Link>}
      <Link href="/account" className="inline-flex items-center gap-2">
        <img src={me.avatarUrl || 'https://placehold.co/32x32'} alt="Profile" className="size-8 rounded-full" />
      </Link>
      <Link href="/logout" className="text-xs underline">Logout</Link>
    </div>
  ) : (
    <Link href="/login">Login</Link>
  )
}