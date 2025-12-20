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

  const [name, setName] = useState('My Lobby')
  const [game, setGame] = useState(defaultGame)
  const [isPublic, setIsPublic] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const { data: existingLobby, isLoading: checking } = useGetMyLobbyQuery()
  const [createLobby, { isLoading: creating }] = useCreateLobbyMutation()
  const [deleteLobby, { isLoading: deleting }] = useDeleteLobbyMutation()

  const submitting = creating || deleting

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
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
        game: GAME_ENUM[game] ?? 0,
        maxPlayers: 10,
        isPublic,
      }).unwrap()

      dispatch(addToast({ type: 'success', message: 'Lobby created!' }))
      router.push(`/lobbies/${result.id}`)
      router.refresh()
    } catch (err: any) {
      if (err?.status === 409) {
        setShowModal(true)
      } else {
        dispatch(addToast({ type: 'error', message: 'Failed to create lobby' }))
      }
    }
  }

  if (existingLobby) {
    const gameKey = typeof existingLobby.game === 'string'
      ? existingLobby.game.toLowerCase()
      : String(existingLobby.game)
    const gameLabel = GAME_LABELS[gameKey] || gameKey.toUpperCase()

    return (
      <div className="space-y-4">
        <div className="bento-card p-6 border-primary/20 bg-primary-soft/30 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="bento-badge bento-badge-primary">Your Active Lobby</div>
              <div className="text-xl font-semibold">{existingLobby.name}</div>
              <div className="flex items-center gap-2">
                <span className="bento-badge bento-badge-muted">{gameLabel}</span>
                <span className={`bento-badge ${existingLobby.isPublic ? 'bento-badge-success' : 'bento-badge-muted'}`}>
                  {existingLobby.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
            <Link
              href={`/lobbies/${existingLobby.id}`}
              className="bento-btn bento-btn-primary"
            >
              Enter Lobby
            </Link>
          </div>
          <div className="pt-4 border-t border-border flex items-center gap-3">
            <span className="text-sm text-text-muted">Want to create a new lobby?</span>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              disabled={submitting}
              className="text-sm text-danger hover:underline disabled:opacity-50"
            >
              Delete and create new
            </button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
            <div className="bento-card p-6 max-w-md w-full mx-4 space-y-4 animate-scale-in">
              <h3 className="text-lg font-semibold">Delete your current lobby?</h3>
              <p className="text-text-muted">
                This will permanently delete &quot;{existingLobby.name}&quot; and all its data.
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bento-btn bento-btn-secondary"
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
                  className="bento-btn bg-danger text-white hover:bg-danger/90"
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
    <>
      <form onSubmit={handleCreate} className="bento-card p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Lobby name</label>
            <input
              className="bento-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter lobby name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Game</label>
            <select
              className="bento-input min-w-[120px]"
              value={game}
              onChange={(e) => setGame(e.target.value)}
            >
              <option value="cs2">CS2</option>
              <option value="val">Valorant</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer py-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-text-secondary">Public</span>
          </label>
          <button
            type="submit"
            disabled={submitting || checking}
            className="bento-btn bento-btn-primary"
          >
            {submitting ? 'Creating...' : 'Create Lobby'}
          </button>
        </div>
      </form>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="bento-card p-6 max-w-md w-full mx-4 space-y-4 animate-scale-in">
            <h3 className="text-lg font-semibold">You already have a lobby</h3>
            <p className="text-text-muted">
              You can only have one active lobby at a time. Please delete your existing lobby first, or refresh the page to see it.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  window.location.reload()
                }}
                className="bento-btn bento-btn-secondary"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
