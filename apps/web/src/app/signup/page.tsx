'use client'
import { useState } from 'react'
import Link from 'next/link'
import { API_BASE } from '@/lib/config'

async function api(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })

  let data: any
  try {
    data = await res.json()
  } catch {
    data = undefined
  }

  if (!res.ok) {
    const identityError =
      (Array.isArray(data) && data[0]?.description) ||
      data?.errors?.[0]?.description ||
      data?.message
    const msg =
      identityError ||
      (res.status === 400 ? 'Please check your input.' : 'Something went wrong. Please try again.')
    throw new Error(msg)
  }

  return data
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('error')
  const [verifyToken, setVerifyToken] = useState('')
  const [verifyUserId, setVerifyUserId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg('')
    try {
      const res = await api('/auth/register', { email, username, password, displayName: username })
      setVerifyToken(res.verificationToken || '')
      setVerifyUserId(res.userId || '')
      setMsgType('success')
      setMsg('Account created! Please verify your email, then login.')
    } catch (err: any) {
      setMsgType('error')
      setMsg(err.message || 'Signup failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify() {
    if (!verifyUserId || !verifyToken) {
      setMsgType('error')
      setMsg('Need userId and token to verify (register first).')
      return
    }
    try {
      await api('/auth/verify-email', { userId: verifyUserId, token: verifyToken })
      setMsgType('success')
      setMsg('Email verified! You can now login.')
    } catch (err: any) {
      setMsgType('error')
      setMsg(err.message || 'Verification failed.')
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 animate-fade-in">
      <div className="bento-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-text-muted">Get started with VeTool</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bento-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bento-input"
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bento-input pr-16"
                placeholder="Create a password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted hover:text-text transition-colors"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {msg && (
            <div
              className={`p-3 rounded-bento-sm text-sm ${
                msgType === 'success'
                  ? 'bg-success-soft text-success'
                  : 'bg-danger-soft text-danger'
              }`}
              role="alert"
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bento-btn bento-btn-primary w-full"
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {verifyToken && (
          <div className="p-4 rounded-bento-sm bg-bg-secondary space-y-3">
            <div className="text-sm font-medium">Dev: Email Verification</div>
            <pre className="text-xs p-3 rounded-bento-sm bg-card border border-border overflow-auto">
              {verifyToken}
            </pre>
            <button
              onClick={handleVerify}
              className="bento-btn bento-btn-secondary w-full"
            >
              Verify Email
            </button>
          </div>
        )}

        <div className="pt-4 border-t border-border text-center">
          <p className="text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
