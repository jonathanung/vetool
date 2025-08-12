"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()
  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .finally(() => router.replace('/'))
  }, [router])
  return (
    <div className="p-4 text-sm">Signing out…</div>
  )
} 