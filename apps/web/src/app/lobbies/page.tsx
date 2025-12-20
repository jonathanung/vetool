import Link from 'next/link'
import { serverApiGet } from '@/lib/api'
import CreateLobbyForm from './CreateLobbyForm'
import RefreshButton from './RefreshButton'

export const dynamic = 'force-dynamic'

const GAME_LABELS: Record<string, string> = {
  '0': 'CS2',
  '1': 'VAL',
  'Cs2': 'CS2',
  'Val': 'VAL',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  '0': { label: 'Open', className: 'bento-badge-success' },
  '1': { label: 'Ready', className: 'bento-badge-primary' },
  '2': { label: 'In Progress', className: 'bento-badge-warning' },
  '3': { label: 'Completed', className: 'bento-badge-muted' },
  'Open': { label: 'Open', className: 'bento-badge-success' },
  'Ready': { label: 'Ready', className: 'bento-badge-primary' },
  'InProgress': { label: 'In Progress', className: 'bento-badge-warning' },
  'Completed': { label: 'Completed', className: 'bento-badge-muted' },
}

export default async function LobbiesPage({ searchParams }: { searchParams: { game?: string } }) {
  const game = (searchParams.game || 'cs2').toLowerCase()
  const data = await serverApiGet<any[]>(`/lobbies?game=${game}`)
  const myLobby = data.find((l) => l.isMine || l.IsMine)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lobbies</h1>
          <p className="text-text-muted mt-1">Find or create a scrim</p>
        </div>
        {myLobby && (
          <Link
            href={`/lobbies/${myLobby.id}`}
            className="bento-btn bento-btn-primary"
          >
            My Lobby
          </Link>
        )}
      </div>

      {/* Game Filter Tabs */}
      <div className="bento-card p-2 inline-flex gap-1">
        <Link
          href="/lobbies?game=cs2"
          className={`px-4 py-2 text-sm font-medium rounded-bento-sm transition-all ${
            game === 'cs2'
              ? 'bg-primary text-primary-contrast'
              : 'text-text-muted hover:text-text hover:bg-bg-secondary'
          }`}
        >
          CS2
        </Link>
        <Link
          href="/lobbies?game=val"
          className={`px-4 py-2 text-sm font-medium rounded-bento-sm transition-all ${
            game === 'val'
              ? 'bg-primary text-primary-contrast'
              : 'text-text-muted hover:text-text hover:bg-bg-secondary'
          }`}
        >
          Valorant
        </Link>
        <div className="w-px bg-border mx-1" />
        <RefreshButton />
      </div>

      {/* Create Lobby Form */}
      <CreateLobbyForm defaultGame={game} />

      {/* Lobby List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-secondary">
            {data.length} {data.length === 1 ? 'lobby' : 'lobbies'} available
          </h2>
        </div>

        {data.length === 0 ? (
          <div className="bento-card p-12 text-center">
            <div className="text-text-muted">No lobbies found</div>
            <p className="text-sm text-text-muted mt-2">Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map((lobby) => {
              const isMine = lobby.isMine ?? lobby.IsMine
              const isPublic = lobby.isPublic ?? lobby.IsPublic ?? true
              const gameLabel = GAME_LABELS[String(lobby.game)] ?? String(lobby.game)
              const statusConfig = STATUS_CONFIG[String(lobby.status)] ?? {
                label: String(lobby.status),
                className: 'bento-badge-muted'
              }

              return (
                <Link
                  key={lobby.id}
                  href={`/lobbies/${lobby.id}`}
                  className="bento-card-interactive p-5 flex items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{lobby.name}</span>
                      {isMine && (
                        <span className="bento-badge bento-badge-primary">You</span>
                      )}
                      {!isPublic && (
                        <span className="bento-badge bento-badge-muted">Private</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bento-badge bento-badge-muted">{gameLabel}</span>
                      <span className={`bento-badge ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-text-muted">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
