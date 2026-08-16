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

const SIZES = [
  { value: 2, label: '1v1' },
  { value: 4, label: '2v2' },
  { value: 6, label: '3v3' },
  { value: 8, label: '4v4' },
  { value: 10, label: '5v5' },
] as const

function isValGame(game: unknown) {
  const key = String(game ?? '').toLowerCase()
  return key === '1' || key === 'val' || key === 'valorant'
}

export default function CreateLobbyForm({ defaultGame }: { defaultGame: string }) {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const [name, setName] = useState('My Lobby')
  const [game, setGame] = useState(defaultGame)
  const [isPublic, setIsPublic] = useState(true)
  const [maxPlayers, setMaxPlayers] = useState(10)
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
        maxPlayers,
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
    const val = isValGame(existingLobby.game)

    return (
      <div className="space-y-4">
        <div className="bento-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-bg-secondary border-b border-border">
            <p className="kicker">My lobby</p>
            <span className="font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
              Host
            </span>
          </div>
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0 space-y-2">
              <div className="font-display text-3xl md:text-4xl leading-none truncate">
                {existingLobby.name}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`bento-badge ${val ? 'chip-val' : 'chip-cs2'}`}>{gameLabel}</span>
                <span className={`bento-badge ${existingLobby.isPublic ? 'bento-badge-success' : 'bento-badge-muted'}`}>
                  {existingLobby.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link href={`/lobbies/${existingLobby.id}`} className="bento-btn bento-btn-primary">
                Enter lobby
              </Link>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={submitting}
                className="bento-btn bento-btn-ghost text-danger hover:bg-danger-soft disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="px-4 py-3 sm:px-5 border-t border-border flex flex-wrap items-center gap-3">
            <span className="text-sm text-text-muted">Want a new room?</span>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              disabled={submitting}
              className="text-sm font-mono uppercase tracking-[0.12em] text-danger hover:underline disabled:opacity-50"
            >
              Delete and create new
            </button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
            <div className="bento-card p-6 max-w-md w-full mx-4 space-y-4 animate-scale-in">
              <p className="kicker">Warning</p>
              <h3 className="font-display text-3xl leading-none">Delete your current lobby?</h3>
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
      <form onSubmit={handleCreate} className="bento-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-bg-secondary border-b border-border">
          <p className="kicker">Setup</p>
          <span className="font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
            Command
          </span>
        </div>
        <div className="px-4 py-5 sm:px-5 space-y-5">
          <h2 className="font-display text-3xl md:text-4xl leading-none">OPEN A ROOM</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="block font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
                Lobby name
              </label>
              <input
                className="bento-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter lobby name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
                Game
              </label>
              <div className="inline-flex border border-border bg-bg-secondary">
                <button
                  type="button"
                  onClick={() => setGame('cs2')}
                  className={`px-3 py-2.5 font-display text-lg tracking-[0.12em] transition-colors ${
                    game === 'cs2' ? 'bg-cs2 text-primary-contrast' : 'text-text-muted hover:text-text'
                  }`}
                >
                  CS2
                </button>
                <button
                  type="button"
                  onClick={() => setGame('val')}
                  className={`px-3 py-2.5 font-display text-lg tracking-[0.12em] transition-colors ${
                    game === 'val' ? 'bg-team-b text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  VAL
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
                Size
              </label>
              <div className="inline-flex flex-wrap border border-border bg-bg-secondary">
                {SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setMaxPlayers(size.value)}
                    className={`px-3 py-2.5 font-display text-lg tracking-[0.1em] transition-colors ${
                      maxPlayers === size.value
                        ? 'bg-card text-text'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
                Visibility
              </label>
              <div className="inline-flex border border-border bg-bg-secondary">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`px-3 py-2.5 font-display text-lg tracking-[0.12em] transition-colors ${
                    isPublic ? 'bg-success-soft text-success' : 'text-text-muted hover:text-text'
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`px-3 py-2.5 font-display text-lg tracking-[0.12em] transition-colors ${
                    !isPublic ? 'bg-card text-text' : 'text-text-muted hover:text-text'
                  }`}
                >
                  Private
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || checking}
              className="bento-btn bento-btn-primary"
            >
              {submitting ? 'Creating...' : 'Create lobby'}
            </button>
          </div>
        </div>
      </form>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="bento-card p-6 max-w-md w-full mx-4 space-y-4 animate-scale-in">
            <p className="kicker">Blocked</p>
            <h3 className="font-display text-3xl leading-none">You already have a lobby</h3>
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
