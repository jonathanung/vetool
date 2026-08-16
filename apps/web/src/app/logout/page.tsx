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
    <div className="container mx-auto py-8">
      <div className="bento-card max-w-md mx-auto p-8 text-center space-y-2">
        <p className="kicker mx-auto justify-center">Session</p>
        <h1 className="font-display text-4xl leading-none">Signing out</h1>
        <p className="text-sm text-text-muted">Clearing your session.</p>
      </div>
    </div>
  )
}
