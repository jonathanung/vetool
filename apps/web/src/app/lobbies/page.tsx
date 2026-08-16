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
  cs2: 'CS2',
  val: 'VAL',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  '0': { label: 'Open', className: 'bento-badge-success' },
  '1': { label: 'Ready', className: 'bento-badge-primary' },
  '2': { label: 'In Progress', className: 'bento-badge-warning' },
  '3': { label: 'Completed', className: 'bento-badge-muted' },
  Open: { label: 'Open', className: 'bento-badge-success' },
  Ready: { label: 'Ready', className: 'bento-badge-primary' },
  InProgress: { label: 'In Progress', className: 'bento-badge-warning' },
  Completed: { label: 'Completed', className: 'bento-badge-muted' },
}

function isValGame(game: unknown) {
  const key = String(game ?? '').toLowerCase()
  return key === '1' || key === 'val' || key === 'valorant'
}

function isOpenStatus(status: unknown) {
  const key = String(status ?? '')
  return key === '0' || key.toLowerCase() === 'open'
}

function pick(obj: any, camel: string, pascal: string) {
  return obj?.[camel] ?? obj?.[pascal]
}

export default async function LobbiesPage({ searchParams }: { searchParams: { game?: string } }) {
  const game = (searchParams.game || 'cs2').toLowerCase()
  const data = await serverApiGet<any[]>(`/lobbies?game=${game}`)
  const myLobby = data.find((l) => l.isMine || l.IsMine)
  const openCount = data.filter((l) => isOpenStatus(l.status ?? l.Status)).length
  const valFloor = game === 'val'

  return (
    <div className="container mx-auto py-8 md:py-10 space-y-8 animate-fade-in">
      <header className="relative overflow-hidden border border-border bg-card">
        <div className="absolute inset-y-0 left-0 w-1 bg-team-a" />
        <div className="absolute inset-y-0 right-0 w-1 bg-team-b" />
        <div className="flex flex-col gap-6 px-5 py-7 sm:px-8 md:flex-row md:items-end md:justify-between md:py-9">
          <div className="max-w-2xl space-y-3">
            <p className="kicker">LIVE FLOOR</p>
            <h1 className="font-display text-6xl sm:text-7xl md:text-8xl leading-[0.82]">Lobbies</h1>
            <p className="text-text-secondary max-w-xl">
              Find an open scrim or stand one up. Same board for CS2 and VALORANT.
            </p>
          </div>
          <div className="stat min-w-[8.5rem]">
            <div className="stat-value">{openCount}</div>
            <div className="stat-label">OPEN</div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-stretch border border-border bg-bg-secondary">
          <Link
            href="/lobbies?game=cs2"
            className={`px-4 py-2.5 font-display text-lg tracking-[0.14em] transition-colors ${
              !valFloor
                ? 'bg-cs2 text-primary-contrast'
                : 'text-text-muted hover:text-text hover:bg-card'
            }`}
          >
            CS2
          </Link>
          <Link
            href="/lobbies?game=val"
            className={`px-4 py-2.5 font-display text-lg tracking-[0.14em] transition-colors ${
              valFloor
                ? 'bg-team-b text-white'
                : 'text-text-muted hover:text-text hover:bg-card'
            }`}
          >
            VALORANT
          </Link>
          <div className="w-px bg-border" />
          <RefreshButton />
        </div>
        {myLobby && (
          <Link href={`/lobbies/${myLobby.id}`} className="bento-btn bento-btn-primary">
            My lobby
          </Link>
        )}
      </div>

      <CreateLobbyForm defaultGame={game} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="kicker">Board</p>
            <h2 className="font-display text-3xl md:text-4xl leading-none">
              {valFloor ? 'VALORANT rooms' : 'CS2 rooms'}
            </h2>
          </div>
          <span className="font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
            {data.length} listed
          </span>
        </div>

        {data.length === 0 ? (
          <div className="bento-card px-6 py-16 text-center space-y-3">
            <h3 className="font-display text-5xl md:text-6xl leading-none">No rooms on this floor</h3>
            <p className="text-text-muted">Open one in the setup panel.</p>
          </div>
        ) : (
          <div className="border border-border bg-card">
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_9rem_7.5rem] gap-4 px-4 py-2 bg-bg-secondary font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
              <span>Room</span>
              <span>Status</span>
              <span className="text-right">Seats</span>
            </div>
            <ul className="divide-y divide-border">
              {data.map((lobby) => {
                const isMine = lobby.isMine ?? lobby.IsMine
                const isPublic = lobby.isPublic ?? lobby.IsPublic ?? true
                const gameLabel = GAME_LABELS[String(lobby.game)] ?? String(lobby.game)
                const val = isValGame(lobby.game)
                const statusConfig = STATUS_CONFIG[String(lobby.status)] ?? {
                  label: String(lobby.status),
                  className: 'bento-badge-muted',
                }
                const memberCount = pick(lobby, 'memberCount', 'MemberCount')
                const maxPlayers = pick(lobby, 'maxPlayers', 'MaxPlayers')
                const hasSeats = memberCount != null || maxPlayers != null

                return (
                  <li key={lobby.id}>
                    <Link
                      href={`/lobbies/${lobby.id}`}
                      className={`group grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_9rem_7.5rem] items-center gap-2 sm:gap-4 px-4 py-3 transition-colors border-l-[3px] border-l-transparent hover:bg-card-hover ${
                        val ? 'hover:border-l-val' : 'hover:border-l-cs2'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`bento-badge shrink-0 ${val ? 'chip-val' : 'chip-cs2'}`}>
                          {gameLabel}
                        </span>
                        <span className="truncate font-semibold">{lobby.name}</span>
                        {isMine && <span className="bento-badge bento-badge-primary">You</span>}
                        {!isPublic && <span className="bento-badge bento-badge-muted">Private</span>}
                      </div>
                      <div>
                        <span className={`bento-badge ${statusConfig.className}`}>{statusConfig.label}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 text-text-muted">
                        {hasSeats && (
                          <span className="font-mono text-sm tabular-nums tracking-wide">
                            {memberCount ?? '—'}
                            {maxPlayers != null && <span className="text-text-muted">/{maxPlayers}</span>}
                          </span>
                        )}
                        <svg
                          className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
