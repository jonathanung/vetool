'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  useGetMyLobbyQuery,
  useCreateLobbyMutation,
  useDeleteLobbyMutation,
  GAME_ENUM,
} from '@/store/api/lobbiesApi'
import { useAppDispatch } from '@/store/hooks'
import { addToast } from '@/store/slices/uiSlice'

const GAME_LABELS: Record<string, string> = {
  // Handle various formats from backend (enum int, enum string, lowercase)
  '0': 'Counter-Strike 2',
  '1': 'Valorant',
  'Cs2': 'Counter-Strike 2',
  'Val': 'Valorant',
  'cs2': 'Counter-Strike 2',
  'val': 'Valorant',
}

export default function CreateLobbyForm({ defaultGame }: { defaultGame: string }) {
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Form state
  const [name, setName] = useState('My Lobby')
  const [game, setGame] = useState(defaultGame)
  const [isPublic, setIsPublic] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // RTK Query - fixes race condition by using built-in loading states
  const { data: existingLobby, isLoading: checking } = useGetMyLobbyQuery()
  const [createLobby, { isLoading: creating }] = useCreateLobbyMutation()
  const [deleteLobby, { isLoading: deleting }] = useDeleteLobbyMutation()

  const submitting = creating || deleting

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    // If user has existing lobby, show confirmation modal
    if (existingLobby) {
      setShowModal(true)
      return
    }

    await doCreate()
  }

  async function doCreate() {
    try {
      const result = await createLobby({
        name,
        game: GAME_ENUM[game] ?? 0,  // Convert string to enum value
        maxPlayers: 10,
        isPublic,
      }).unwrap()

      dispatch(addToast({ type: 'success', message: 'Lobby created!' }))
      router.push(`/lobbies/${result.id}`)
      router.refresh()
    } catch (err: any) {
      if (err?.status === 409) {
        // User already has a lobby - show modal
        setShowModal(true)
      } else {
        dispatch(addToast({ type: 'error', message: 'Failed to create lobby' }))
      }
    }
  }

  // If user has an existing lobby, show a card to join it
  if (existingLobby) {
    const gameKey = typeof existingLobby.game === 'string'
      ? existingLobby.game.toLowerCase()
      : String(existingLobby.game)
    const gameLabel = GAME_LABELS[gameKey] || gameKey.toUpperCase()

    return (
      <div className="space-y-4">
        {/* Existing lobby card */}
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Your Active Lobby
              </div>
              <div className="text-lg font-semibold">{existingLobby.name}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1 rounded bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium">
                  {gameLabel}
                </span>
                <span className={existingLobby.isPublic ? 'text-green-600' : 'text-gray-500'}>
                  {existingLobby.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
            <Link
              href={`/lobbies/${existingLobby.id}`}
              className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Join Lobby
            </Link>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-blue-500/20">
            <span className="text-xs text-gray-500">Want to create a new lobby?</span>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              disabled={submitting}
              className="text-xs text-red-600 hover:text-red-700 underline disabled:opacity-50"
            >
              Delete and create new
            </button>
          </div>
        </div>

        {/* Confirmation modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-4 space-y-3 shadow-lg">
              <div className="text-base font-semibold">Delete your current lobby?</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                This will permanently delete &quot;{existingLobby.name}&quot; and all its data.
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded border px-3 py-2 text-sm"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteLobby(existingLobby.id).unwrap()
                      dispatch(addToast({ type: 'success', message: 'Lobby deleted' }))
                      setShowModal(false)
                    } catch {
                      dispatch(addToast({ type: 'error', message: 'Failed to delete lobby' }))
                    }
                  }}
                  disabled={submitting}
                  className="rounded bg-red-600 text-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm">Lobby name</label>
        <input
          className="rounded border px-3 py-2 bg-transparent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm">Game</label>
        <select
          className="rounded border px-3 py-2 bg-transparent"
          value={game}
          onChange={(e) => setGame(e.target.value)}
        >
          <option value="cs2">CS2</option>
          <option value="val">VAL</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Public (show in list)
      </label>
      <button
        type="submit"
        disabled={submitting || checking}
        className="rounded bg-gray-900 text-white px-3 py-2 text-sm dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Create lobby'}
      </button>

      {/* Modal shown when API returns 409 (user has lobby but RTK Query didn't detect it) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-4 space-y-3 shadow-lg">
            <div className="text-base font-semibold">You already have a lobby</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              You can only have one active lobby at a time. Please delete your existing lobby first, or refresh the page to see it.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  window.location.reload()
                }}
                className="rounded border px-3 py-2 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
