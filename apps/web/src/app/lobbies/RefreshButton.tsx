'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RefreshButton() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    // Give it a moment to show the spinning state
    setTimeout(() => setRefreshing(false), 500)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="rounded border px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
      title="Refresh lobby list"
    >
      {refreshing ? '↻' : '↻'} Refresh
    </button>
  )
}
