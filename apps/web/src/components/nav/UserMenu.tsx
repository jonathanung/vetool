'use client'
import Link from 'next/link'
import { useGetMeQuery } from '@/store/api/authApi'
import { useGetMyLobbyQuery } from '@/store/api/lobbiesApi'

export default function UserMenu() {
  const { data: me, isLoading: meLoading } = useGetMeQuery()
  const { data: myLobby } = useGetMyLobbyQuery(undefined, {
    skip: !me,
  })

  if (meLoading) {
    return <div className="size-8 rounded-full bg-bg-secondary animate-pulse" />
  }

  return me ? (
    <div className="flex items-center gap-2">
      {myLobby && (
        <Link href={`/lobbies/${myLobby.id}`} className="bento-btn bento-btn-ghost text-sm px-3 py-2">
          My lobby
        </Link>
      )}
      <span className="hidden sm:inline text-sm text-text-secondary px-2">
        {me.displayName || me.userName}
      </span>
      <Link href="/logout" className="bento-btn bento-btn-secondary text-sm px-3 py-2">
        Logout
      </Link>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/signup" className="bento-btn bento-btn-ghost text-sm px-3 py-2">
        Sign up
      </Link>
      <Link href="/login" className="bento-btn bento-btn-primary text-sm px-3 py-2">
        Login
      </Link>
    </div>
  )
}
