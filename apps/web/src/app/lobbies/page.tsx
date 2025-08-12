import Link from 'next/link'
import { apiGet } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function LobbiesPage({ searchParams }: { searchParams: { game?: string } }) {
  const game = (searchParams.game || 'cs2').toLowerCase()
  const data = await apiGet<any[]>(`/lobbies?game=${game}`)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link className={`px-3 py-1 rounded ${game==='cs2'?'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900':''}`} href="/lobbies?game=cs2">CS2</Link>
        <Link className={`px-3 py-1 rounded ${game==='val'?'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900':''}`} href="/lobbies?game=val">VAL</Link>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {data.map((lobby) => (
          <li key={lobby.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{lobby.name}</div>
              <div className="text-xs text-gray-500">{lobby.game} • {lobby.status}</div>
            </div>
            <Link className="text-sm underline" href={`/lobbies/${lobby.id}`}>Open</Link>
          </li>
        ))}
      </ul>
    </div>
  )
} 