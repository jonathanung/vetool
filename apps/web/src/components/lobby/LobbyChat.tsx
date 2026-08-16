'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { sendChat } from '@/store/slices/lobbySlice'
import { useGetMeQuery } from '@/store/api/authApi'

export default function LobbyChat({ disabled }: { disabled?: boolean }) {
  const dispatch = useAppDispatch()
  const { data: me } = useGetMeQuery()
  const messages = useAppSelector((s) => s.lobby.messages)
  const status = useAppSelector((s) => s.lobby.connectionStatus)
  const [body, setBody] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || disabled || status !== 'connected') return
    dispatch(sendChat({ body: text }))
    setBody('')
  }

  const live = !disabled && status === 'connected' && Boolean(me?.id)

  return (
    <section className="bento-card overflow-hidden flex flex-col min-h-[22rem]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
        <div>
          <p className="kicker">Comms</p>
          <h2 className="font-display text-3xl leading-none mt-1">Lobby chat</h2>
        </div>
        <span className="bento-badge bento-badge-muted">{messages.length}</span>
      </div>
      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[22rem]">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted">No messages yet. Call the mid, post the code.</p>
        ) : (
          messages.map((m) => {
            const mine = me?.id === m.userId
            return (
              <div key={m.id} className={`text-sm ${mine ? 'text-team-a' : 'text-text'}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold truncate">{m.name}</span>
                  <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-text-muted">
                    {formatClock(m.createdAt)}
                  </span>
                </div>
                <p className="text-text-secondary break-words">{m.body}</p>
              </div>
            )
          })
        )}
      </div>
      <form onSubmit={submit} className="border-t border-border p-3 flex gap-2">
        <input
          className="bento-input"
          value={body}
          maxLength={300}
          disabled={!live}
          onChange={(e) => setBody(e.target.value)}
          placeholder={live ? 'Send a message' : 'Chat unavailable'}
        />
        <button type="submit" disabled={!live || !body.trim()} className="bento-btn bento-btn-primary">
          Send
        </button>
      </form>
    </section>
  )
}

function formatClock(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
