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

  const { data: me, isLoading: checkingAuth } = useGetMeQuery()

  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [login, { isLoading: submitting, error }] = useLoginMutation()

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
      const message = err?.status === 400 || err?.status === 401
        ? 'Incorrect email or password.'
        : 'Something went wrong. Please try again.'
      dispatch(addToast({ type: 'error', message }))
    }
  }

  if (checkingAuth) {
    return (
      <div className="max-w-md mx-auto py-12 animate-fade-in">
        <div className="bento-card p-8 text-center">
          <div className="text-text-muted">Checking authentication...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 animate-fade-in">
      <div className="bento-card p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-text-muted">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">
              Email or Username
            </label>
            <input
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="bento-input"
              placeholder="Enter your email or username"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bento-input pr-16"
                placeholder="Enter your password"
                autoComplete="current-password"
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

          {error && (
            <div className="p-3 rounded-bento-sm bg-danger-soft text-danger text-sm" role="alert">
              {(error as any)?.status === 400 || (error as any)?.status === 401
                ? 'Incorrect email or password.'
                : 'Something went wrong. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bento-btn bento-btn-primary w-full"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-border text-center">
          <p className="text-sm text-text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
