'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

// Types
interface User {
  id: string
  username: string
  pointsBalance: number
  totalDeals: number
  completedDeals: number
  reliabilityPercent: number
}

interface UserStats {
  totalDuels: number
  wins: number
  losses: number
  winRate: number
  totalEarnings: number
  currentStreak: number
  reliabilityPercent: number
}

interface AuthContextType {
  user: User | null
  stats: UserStats | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateProfile: (data: { username?: string; telegramId?: string }) => Promise<{ success: boolean; error?: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch current user on mount
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        setStats(data.data.stats)
      } else {
        setUser(null)
        setStats(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        await refreshUser() // Fetch stats
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Register
  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        await refreshUser() // Fetch stats
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setStats(null)
    }
  }

  // Update profile
  const updateProfile = async (data: { username?: string; telegramId?: string }) => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        setUser(result.data.user)
        return { success: true }
      }

      return { success: false, error: result.error }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (data.success) {
        // User will be logged out
        setUser(null)
        setStats(null)
        return { success: true }
      }

      return { success: false, error: data.error }
    } catch (error) {
      console.error('Change password error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

