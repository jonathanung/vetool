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
    return <div className="size-8 bg-bg-secondary animate-pulse" />
  }

  return me ? (
    <div className="flex items-center gap-1">
      {myLobby && (
        <Link href={`/lobbies/${myLobby.id}`} className="bento-btn bento-btn-ghost text-xs px-3 py-2">
          My lobby
        </Link>
      )}
      <span className="hidden sm:inline text-xs font-mono tracking-[0.12em] uppercase text-text-secondary px-2">
        {me.displayName || me.userName}
      </span>
      <Link href="/logout" className="bento-btn bento-btn-secondary text-xs px-3 py-2">
        Logout
      </Link>
    </div>
  ) : (
    <div className="flex items-center gap-1">
      <span className="hidden sm:inline">
        <Link href="/signup" className="bento-btn bento-btn-ghost text-xs px-3 py-2">
          Sign up
        </Link>
      </span>
      <Link href="/login" className="bento-btn bento-btn-primary text-xs px-3 py-2">
        Login
      </Link>
    </div>
  )
}
