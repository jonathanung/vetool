import Link from 'next/link'
import { apiGet } from '@/lib/api'
import CreateLobbyForm from './CreateLobbyForm'
import RefreshButton from './RefreshButton'

export const dynamic = 'force-dynamic'

const GAME_LABELS: Record<string, string> = {
  '0': 'CS2',
  '1': 'VAL',
  'Cs2': 'CS2',
  'Val': 'VAL',
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Open',
  '1': 'Ready',
  '2': 'In Progress',
  '3': 'Completed',
  'Open': 'Open',
  'Ready': 'Ready',
  'InProgress': 'In Progress',
  'Completed': 'Completed',
}

export default async function LobbiesPage({ searchParams }: { searchParams: { game?: string } }) {
  const game = (searchParams.game || 'cs2').toLowerCase()
  const data = await apiGet<any[]>(`/lobbies?game=${game}`)
  const myLobby = data.find((l) => l.isMine || l.IsMine)
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link className={`px-3 py-1 rounded ${game==='cs2'?'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900':''}`} href="/lobbies?game=cs2">CS2</Link>
          <Link className={`px-3 py-1 rounded ${game==='val'?'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900':''}`} href="/lobbies?game=val">VAL</Link>
          <RefreshButton />
          {myLobby && (
            <Link className="ml-auto text-sm underline" href={`/lobbies/${myLobby.id}`}>My lobby</Link>
          )}
        </div>
        <CreateLobbyForm defaultGame={game} />
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {data.map((lobby) => {
          const isMine = lobby.isMine ?? lobby.IsMine
          const isPublic = lobby.isPublic ?? lobby.IsPublic ?? true
          const gameLabel = GAME_LABELS[String(lobby.game)] ?? String(lobby.game)
          const statusLabel = STATUS_LABELS[String(lobby.status)] ?? String(lobby.status)
          return (
          <li key={lobby.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                <span>{lobby.name}</span>
                {isMine && <span className="text-xs rounded bg-blue-100 text-blue-700 px-2 py-0.5 dark:bg-blue-900 dark:text-blue-100">Mine</span>}
                {!isPublic && <span className="text-xs rounded bg-gray-200 text-gray-700 px-2 py-0.5 dark:bg-gray-800 dark:text-gray-200">Private</span>}
              </div>
              <div className="text-xs text-gray-500">{gameLabel} • {statusLabel}</div>
            </div>
            <Link className="text-sm underline" href={`/lobbies/${lobby.id}`}>Open</Link>
          </li>
        )})}
      </ul>
    </div>
  )
}