"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Me = { id: string; userName: string; displayName: string; email: string; avatarUrl?: string }

export default function UserMenu() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />

  return me ? (
    <div className="flex items-center gap-3">
      <Link href="/account" className="inline-flex items-center gap-2">
        <img src={me.avatarUrl || 'https://placehold.co/32x32'} alt="Profile" className="size-8 rounded-full" />
      </Link>
      <Link href="/logout" className="text-xs underline">Logout</Link>
    </div>
  ) : (
    <Link href="/login">Login</Link>
  )
} 