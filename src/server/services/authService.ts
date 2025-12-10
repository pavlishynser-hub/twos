/**
 * Auth Service
 * Handles user registration, login, sessions
 * Sessions stored in DATABASE for serverless compatibility
 */

import prisma from '@/lib/prisma'
import { UserDto, TransactionType } from '../types/duel.types'

// ============================================
// TYPES
// ============================================

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: UserDto
  token?: string
  error?: string
}

// Session settings
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const INITIAL_BALANCE = 500 // New users get 500 points

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Simple password hashing (use bcrypt in production)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'twos_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify password
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password)
  return computed === hash
}

/**
 * Generate session token
 */
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate username
 */
function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  return usernameRegex.test(username)
}

/**
 * Validate password strength
 */
function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }
  if (password.length > 100) {
    return { valid: false, message: 'Password too long' }
  }
  return { valid: true }
}

// ============================================
// AUTH SERVICE - NOW WITH DATABASE SESSIONS
// ============================================

export class AuthService {
  /**
   * Register new user - SAVES TO DATABASE
   */
  static async register(request: RegisterRequest): Promise<AuthResponse> {
    const { username, email, password } = request

    // Validate username
    if (!isValidUsername(username)) {
      return { 
        success: false, 
        error: 'Username must be 3-20 characters, alphanumeric and underscores only' 
      }
    }

    // Validate email
    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' }
    }

    // Validate password
    const passwordCheck = isValidPassword(password)
    if (!passwordCheck.valid) {
      return { success: false, error: passwordCheck.message }
    }

    try {
      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })
      if (existingEmail) {
        return { success: false, error: 'Email already registered' }
      }

      // Check if username already exists
      const existingUsername = await prisma.user.findUnique({
        where: { username: username }
      })
      if (existingUsername) {
        return { success: false, error: 'Username already taken' }
      }

      // Create user in database
      const passwordHash = await hashPassword(password)
      const token = generateToken()
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
      
      // Create user and session in transaction
      const user = await prisma.user.create({
        data: {
          username,
          email: email.toLowerCase(),
          passwordHash,
          pointsBalance: INITIAL_BALANCE,
          totalDeals: 0,
          completedDeals: 0,
          reliabilityPercent: 100.0,
          sessions: {
            create: {
              token,
              expiresAt,
            }
          }
        }
      })

      // Record initial balance transaction
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'INITIAL_BALANCE',
          amountPoints: INITIAL_BALANCE,
          description: 'Welcome bonus',
        }
      })

      return {
        success: true,
        user: this.toUserDto(user),
        token,
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Registration failed. Please try again.' }
    }
  }

  /**
   * Login user - READS FROM DATABASE
   */
  static async login(request: LoginRequest): Promise<AuthResponse> {
    const { email, password } = request
    console.log('AuthService.login called for:', email)

    try {
      // Find user by email
      console.log('Looking for user with email:', email.toLowerCase())
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })
      console.log('User found:', user ? 'yes' : 'no', user?.id)
      
      if (!user || !user.passwordHash) {
        console.log('User not found or no password hash')
        return { success: false, error: 'Invalid email or password' }
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash)
      console.log('Password valid:', isValid)
      if (!isValid) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Create session in database
      const token = generateToken()
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

      console.log('Creating session for user:', user.id)
      await prisma.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        }
      })
      console.log('Session created successfully')

      return {
        success: true,
        user: this.toUserDto(user),
        token,
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  /**
   * Logout user (delete session from database)
   */
  static async logout(token: string): Promise<boolean> {
    try {
      await prisma.session.deleteMany({
        where: { token }
      })
      return true
    } catch (error) {
      console.error('Logout error:', error)
      return false
    }
  }

  /**
   * Validate session from DATABASE
   */
  static async validateSession(token: string): Promise<{ valid: boolean; user?: UserDto }> {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true }
      })
      
      if (!session) {
        return { valid: false }
      }

      // Check if expired
      if (new Date() > session.expiresAt) {
        // Delete expired session
        await prisma.session.delete({ where: { id: session.id } })
        return { valid: false }
      }

      return {
        valid: true,
        user: this.toUserDto(session.user),
      }
    } catch (error) {
      console.error('Session validation error:', error)
      return { valid: false }
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserDto | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      return user ? this.toUserDto(user) : null
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: { username?: string; telegramId?: string }
  ): Promise<{ success: boolean; user?: UserDto; error?: string }> {
    try {
      if (updates.username) {
        if (!isValidUsername(updates.username)) {
          return { 
            success: false, 
            error: 'Username must be 3-20 characters, alphanumeric and underscores only' 
          }
        }

        const existing = await prisma.user.findFirst({
          where: {
            username: updates.username,
            NOT: { id: userId }
          }
        })
        if (existing) {
          return { success: false, error: 'Username already taken' }
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(updates.username && { username: updates.username }),
          ...(updates.telegramId !== undefined && { telegramId: updates.telegramId }),
        }
      })

      return {
        success: true,
        user: this.toUserDto(user),
      }
    } catch (error) {
      console.error('Update profile error:', error)
      return { success: false, error: 'Failed to update profile' }
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user || !user.passwordHash) {
        return { success: false, error: 'User not found' }
      }

      const isValid = await verifyPassword(currentPassword, user.passwordHash)
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' }
      }

      const passwordCheck = isValidPassword(newPassword)
      if (!passwordCheck.valid) {
        return { success: false, error: passwordCheck.message }
      }

      const newHash = await hashPassword(newPassword)
      
      // Update password and delete all sessions
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newHash }
        }),
        prisma.session.deleteMany({
          where: { userId }
        })
      ])

      return { success: true }
    } catch (error) {
      console.error('Change password error:', error)
      return { success: false, error: 'Failed to change password' }
    }
  }

  /**
   * Get user stats
   */
  static async getUserStats(userId: string): Promise<{
    totalDuels: number
    wins: number
    losses: number
    winRate: number
    totalEarnings: number
    currentStreak: number
    reliabilityPercent: number
  } | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      if (!user) return null

      const matches = await prisma.duelMatch.findMany({
        where: {
          OR: [
            { creatorUserId: userId },
            { opponentUserId: userId }
          ],
          status: 'FINISHED'
        }
      })

      let wins = 0
      let losses = 0
      
      for (const match of matches) {
        if (match.winnerId === userId) {
          wins++
        } else if (match.winnerId) {
          losses++
        }
      }

      const totalDuels = wins + losses
      
      return {
        totalDuels,
        wins,
        losses,
        winRate: totalDuels > 0 ? Math.round((wins / totalDuels) * 100) : 0,
        totalEarnings: user.pointsBalance - INITIAL_BALANCE,
        currentStreak: 0,
        reliabilityPercent: user.reliabilityPercent,
      }
    } catch (error) {
      console.error('Get stats error:', error)
      return null
    }
  }

  /**
   * Update user balance
   */
  static async updateBalance(
    userId: string,
    amount: number,
    type: TransactionType,
    description?: string
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      const newBalance = user.pointsBalance + amount
      if (newBalance < 0) {
        return { success: false, error: 'Insufficient balance' }
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { pointsBalance: newBalance }
        }),
        prisma.transaction.create({
          data: {
            userId,
            type,
            amountPoints: amount,
            description,
          }
        })
      ])

      return {
        success: true,
        newBalance,
      }
    } catch (error) {
      console.error('Update balance error:', error)
      return { success: false, error: 'Failed to update balance' }
    }
  }

  /**
   * Convert to DTO
   */
  private static toUserDto(user: {
    id: string
    username: string
    pointsBalance: number
    totalDeals: number
    completedDeals: number
    reliabilityPercent: number
  }): UserDto {
    return {
      id: user.id,
      username: user.username,
      pointsBalance: user.pointsBalance,
      totalDeals: user.totalDeals,
      completedDeals: user.completedDeals,
      reliabilityPercent: user.reliabilityPercent,
    }
  }

  /**
   * Create demo user for testing
   */
  static async createDemoUser(): Promise<AuthResponse> {
    const demoEmail = 'demo@twos.game'
    
    const existing = await prisma.user.findUnique({
      where: { email: demoEmail }
    })
    
    if (existing) {
      return this.login({ email: demoEmail, password: 'demo123' })
    }

    return this.register({
      username: 'DemoPlayer',
      email: demoEmail,
      password: 'demo123',
    })
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      })
      return result.count
    } catch (error) {
      console.error('Cleanup sessions error:', error)
      return 0
    }
  }
}
