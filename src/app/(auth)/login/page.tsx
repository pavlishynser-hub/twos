'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { clsx } from 'clsx'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push('/')
    } else {
      setError(result.error || 'Login failed')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-2xl font-bold">
            T
          </div>
          <h1 className="text-3xl font-bold text-gradient">TWOS</h1>
          <p className="text-gray-400 mt-2">Welcome back!</p>
        </div>

        {/* Login Form */}
        <div className="card-base">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error */}
            {error && (
              <div className="p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-accent-danger text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                'w-full btn-primary',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-dark-600" />
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 h-px bg-dark-600" />
          </div>

          {/* Register Link */}
          <p className="text-center text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-accent-primary hover:text-accent-secondary transition-colors">
              Register
            </Link>
          </p>
        </div>

        {/* Demo Account */}
        <div className="mt-6 p-4 bg-dark-800/50 rounded-xl text-center">
          <p className="text-sm text-gray-500 mb-2">Demo account:</p>
          <p className="text-sm text-gray-400">
            <span className="text-white">demo@twos.game</span> / <span className="text-white">demo123</span>
          </p>
        </div>
      </div>
    </div>
  )
}

