import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome to VeTool</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">Organize CS2 and VAL scrims with realtime lobbies, captain picks, and map veto.</p>
      <div className="flex gap-4">
        <Link className="rounded bg-gray-900 text-white px-3 py-2 text-sm dark:bg-gray-100 dark:text-gray-900" href="/lobbies">Browse Lobbies</Link>
      </div>
    </div>
  )
}
