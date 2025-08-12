"use client"
import { useState } from 'react'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!

async function api(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const msg = res.status === 400 ? 'Please check your input.' : 'Something went wrong. Please try again.'
    throw new Error(msg)
  }
  return res.json()
}

export default function SignupPage() {
  const [email, setEmail] = useState('demo@example.com')
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('DemoPass123!')
  const [msg, setMsg] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg('')
    try {
      const res = await api('/auth/register', { email, username, password, displayName: username })
      setVerifyToken(res.verificationToken || '')
      setMsg('Registered. Please verify your email (dev mode: use token below), then login.')
    } catch (err: any) {
      setMsg(err.message || 'Signup failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify() {
    try {
      await api('/auth/verify-email', { userId: '', token: verifyToken })
      setMsg('Verified. You can now login.')
    } catch (err: any) {
      setMsg(err.message || 'Verification failed.')
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Create account</h1>
      <form onSubmit={handleSignup} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full rounded border p-2 bg-transparent" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Username</label>
          <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full rounded border p-2 bg-transparent" />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full rounded border p-2 bg-transparent" />
        </div>
        <button disabled={submitting} className="rounded bg-gray-900 text-white px-3 py-2 text-sm dark:bg-gray-100 dark:text-gray-900" aria-disabled={submitting}>
          {submitting ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      {msg && <p className="text-sm text-red-600" role="alert" aria-live="polite">{msg}</p>}
      {verifyToken && (
        <div className="space-y-2">
          <div className="text-sm">Dev verification token:</div>
          <pre className="text-xs p-2 rounded border overflow-auto">{verifyToken}</pre>
          <button onClick={handleVerify} className="rounded border px-3 py-2 text-sm">Verify</button>
        </div>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-300">Already have an account? <Link className="underline" href="/login">Login</Link>.</p>
    </div>
  )
} 