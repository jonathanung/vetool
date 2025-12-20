'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLoginMutation, useGetMeQuery } from '@/store/api/authApi'
import { useAppDispatch } from '@/store/hooks'
import { addToast } from '@/store/slices/uiSlice'

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Check if already logged in
  const { data: me, isLoading: checkingAuth } = useGetMeQuery()

  // Form state - empty defaults (removed hardcoded test credentials)
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // RTK Query mutation
  const [login, { isLoading: submitting, error }] = useLoginMutation()

  // Redirect if already logged in
  useEffect(() => {
    if (me) {
      router.replace('/lobbies')
    }
  }, [me, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    try {
      await login({ usernameOrEmail: emailOrUsername, password }).unwrap()
      dispatch(addToast({ type: 'success', message: 'Welcome back!' }))
      router.push('/lobbies')
    } catch (err: any) {
      // Error handling - RTK Query provides the error
      const message = err?.status === 400 || err?.status === 401
        ? 'Incorrect email or password.'
        : 'Something went wrong. Please try again.'
      dispatch(addToast({ type: 'error', message }))
    }
  }

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Login</h1>
        <div className="text-sm text-gray-500">Checking authentication...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>
      <form onSubmit={handleLogin} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm">Email or Username</label>
          <input
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            className="w-full rounded border p-2 bg-transparent"
            aria-label="Email or Username"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <div className="flex items-center gap-2">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border p-2 bg-transparent"
              aria-label="Password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="rounded border px-2 py-1 text-xs"
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button
          disabled={submitting}
          className="rounded bg-gray-900 text-white px-3 py-2 text-sm dark:bg-gray-100 dark:text-gray-900 w-full disabled:opacity-50"
          aria-disabled={submitting}
        >
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {(error as any)?.status === 400 || (error as any)?.status === 401
            ? 'Incorrect email or password.'
            : 'Something went wrong. Please try again.'}
        </p>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Don&apos;t have an account?{' '}
        <Link className="underline" href="/signup">
          Create one
        </Link>
        .
      </p>
    </div>
  )
}
