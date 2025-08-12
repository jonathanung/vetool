"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

async function api(path: string, body?: any) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  return res
}

export default function LoginPage() {
  const router = useRouter()
  const [emailOrUsername, setEmailOrUsername] = useState('demo')
  const [password, setPassword] = useState('DemoPass123!')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // best effort check
    fetch('/api/auth/me', { credentials: 'include' }).then(async (r)=>{ if (r.ok) router.replace('/lobbies') })
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg('')
    try {
      const res = await api('/api/auth/login', { usernameOrEmail: emailOrUsername, password })
      if (res.ok) {
        router.push('/lobbies')
      } else {
        setMsg(res.status === 400 || res.status === 401 ? 'Incorrect email or password.' : 'Something went wrong. Please try again.')
      }
    } catch (err: any) {
      setMsg('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>
      <form onSubmit={handleLogin} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm">Email or Username</label>
          <input value={emailOrUsername} onChange={(e)=>setEmailOrUsername(e.target.value)} className="w-full rounded border p-2 bg-transparent" aria-label="Email or Username" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded border p-2 bg-transparent" aria-label="Password" />
        </div>
        <button disabled={submitting} className="rounded bg-gray-900 text-white px-3 py-2 text-sm dark:bg-gray-100 dark:text-gray-900" aria-disabled={submitting}>
          {submitting ? 'Signing in…' : 'Login'}
        </button>
      </form>
      {msg && <p className="text-sm text-red-600" role="alert" aria-live="polite">{msg}</p>}
      <p className="text-sm text-gray-600 dark:text-gray-300">Don&apos;t have an account? <Link className="underline" href="/signup">Create one</Link>.</p>
    </div>
  )
} 