'use client'
import Link from 'next/link'
import { useGetMeQuery } from '@/store/api/authApi'
import { useGetMyLobbyQuery } from '@/store/api/lobbiesApi'

export default function UserMenu() {
  const { data: me, isLoading: meLoading } = useGetMeQuery()
  const { data: myLobby } = useGetMyLobbyQuery(undefined, {
    skip: !me, // Only fetch lobby if user is authenticated
  })

  if (meLoading) {
    return <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
  }

  return me ? (
    <div className="flex items-center gap-3">
      {myLobby && (
        <Link href={`/lobbies/${myLobby.id}`} className="text-xs underline">
          My lobby
        </Link>
      )}
      <Link href="/account" className="inline-flex items-center gap-2">
        <img
          src={me.avatarUrl || 'https://placehold.co/32x32'}
          alt="Profile"
          className="size-8 rounded-full"
        />
      </Link>
      <Link href="/logout" className="text-xs underline">
        Logout
      </Link>
    </div>
  ) : (
    <Link href="/login">Login</Link>
  )
}
