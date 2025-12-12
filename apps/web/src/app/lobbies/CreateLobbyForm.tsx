"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateLobbyForm({ defaultGame }: { defaultGame: string }) {
  const router = useRouter()
  const [name, setName] = useState('My Lobby')
  const [game, setGame] = useState(defaultGame)
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [existingLobbyId, setExistingLobbyId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [confirmingReplace, setConfirmingReplace] = useState(false)
  const [showModal, setShowModal] = useState(false)

  async function loadMine() {
    setChecking(true)
    try {
      const res = await fetch('/api/lobbies?mine=true', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const mine = (data as any[]).find(l => l.isMine || l.IsMine)
        const id = mine?.id || mine?.Id
        setExistingLobbyId(id || null)
      } else {
        setExistingLobbyId(null)
      }
    } catch {
      setExistingLobbyId(null)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    loadMine()
  }, [])

  async function createLobby() {
    const res = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, game, maxPlayers: 10, isPublic }),
    })
    if (!res.ok) {
      if (res.status === 409) {
        await loadMine()
        setConfirmingReplace(true)
        setShowModal(true)
        setError('You already own a lobby.')
      } else {
        setError('Failed to create lobby.')
      }
      return null
    }
    const data = await res.json()
    return data.id as string
  }

  async function handleReplace() {
    if (!existingLobbyId) {
      await loadMine()
    }
    if (!existingLobbyId) {
      setError('Could not find your existing lobby to replace. Creating a new one.')
      // best effort: proceed to create
      const newId = await createLobby()
      if (newId) {
        alert('Lobby created.')
        router.push(`/lobbies/${newId}`)
        router.refresh()
        setConfirmingReplace(false)
        setShowModal(false)
      }
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const del = await fetch(`/api/lobbies?id=${existingLobbyId}`, { method: 'DELETE', credentials: 'include' })
      if (!del.ok) {
          const msg = del.status === 404 ? 'Existing lobby not found; creating a new one anyway.' : `Failed to delete existing lobby (status ${del.status}).`
          setError(msg)
          if (del.status !== 404) {
            return
          }
      }
      setExistingLobbyId(null)
      const newId = await createLobby()
      if (newId) {
        alert('Lobby replaced.')
        router.push(`/lobbies/${newId}`)
        router.refresh()
      }
      setConfirmingReplace(false)
      setShowModal(false)
    } catch {
      setError('Failed to replace lobby.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (existingLobbyId) {
      await loadMine()
      setConfirmingReplace(true)
      setShowModal(true)
      return
    }
    setSubmitting(true)
    try {
      const newId = await createLobby()
      if (newId) {
        router.push(`/lobbies/${newId}`)
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Lobby name</label>
        <input className="rounded border px-3 py-2 bg-transparent" value={name} onChange={(e)=>setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm">Game</label>
        <select className="rounded border px-3 py-2 bg-transparent" value={game} onChange={(e)=>setGame(e.target.value)}>
          <option value="cs2">CS2</option>
          <option value="val">VAL</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e)=>setIsPublic(e.target.checked)} />
        Public (show in list)
      </label>
      <button type="submit" disabled={submitting || checking} className="rounded bg-gray-900 text-white px-3 py-2 text-sm dark:bg-gray-100 dark:text-gray-900">
        {submitting ? 'Creating…' : 'Create lobby'}
      </button>
      {existingLobbyId && <span className="text-xs text-gray-500">You already own a lobby; creating will replace it.</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}

      {showModal && confirmingReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-4 space-y-3 shadow-lg">
            <div className="text-base font-semibold">Replace your current lobby?</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">This will delete your existing lobby and create a new one.</div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={()=>{setConfirmingReplace(false); setShowModal(false)}} className="rounded border px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleReplace} disabled={submitting} className="rounded bg-red-600 text-white px-3 py-2 text-sm">
                {submitting ? 'Replacing…' : 'Yes, replace'}
              </button>
            </div>
            <div className="text-xs text-gray-500 break-all">
              Existing lobby id: {existingLobbyId || 'unknown'}
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        </div>
      )}
    </form>
  )
}
