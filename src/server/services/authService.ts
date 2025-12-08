/**
 * Auth Service
 * Handles user registration, login, sessions
 */

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

export interface SessionData {
  userId: string
  username: string
  email: string
  createdAt: number
  expiresAt: number
}

// ============================================
// IN-MEMORY STORES (Replace with Prisma + Redis)
// ============================================

interface UserRecord {
  id: string
  username: string
  email: string
  passwordHash: string
  telegramId?: string
  pointsBalance: number
  totalDeals: number
  completedDeals: number
  reliabilityPercent: number
  createdAt: Date
  updatedAt: Date
}

const usersStore: Map<string, UserRecord> = new Map()
const emailIndex: Map<string, string> = new Map() // email -> id
const sessionsStore: Map<string, SessionData> = new Map() // token -> session

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
 * Generate user ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
  // 3-20 characters, alphanumeric and underscores
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
// AUTH SERVICE
// ============================================

export class AuthService {
  /**
   * Register new user
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

    // Check if email already exists
    if (emailIndex.has(email.toLowerCase())) {
      return { success: false, error: 'Email already registered' }
    }

    // Check if username already exists
    let usernameExists = false
    usersStore.forEach((user) => {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        usernameExists = true
      }
    })
    if (usernameExists) {
      return { success: false, error: 'Username already taken' }
    }

    // Create user
    const userId = generateUserId()
    const passwordHash = await hashPassword(password)
    const now = new Date()

    const user: UserRecord = {
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash,
      pointsBalance: INITIAL_BALANCE,
      totalDeals: 0,
      completedDeals: 0,
      reliabilityPercent: 100.0,
      createdAt: now,
      updatedAt: now,
    }

    usersStore.set(userId, user)
    emailIndex.set(email.toLowerCase(), userId)

    // Create session
    const token = generateToken()
    const session: SessionData = {
      userId,
      username,
      email: email.toLowerCase(),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    }
    sessionsStore.set(token, session)

    return {
      success: true,
      user: this.toUserDto(user),
      token,
    }
  }

  /**
   * Login user
   */
  static async login(request: LoginRequest): Promise<AuthResponse> {
    const { email, password } = request

    // Find user by email
    const userId = emailIndex.get(email.toLowerCase())
    if (!userId) {
      return { success: false, error: 'Invalid email or password' }
    }

    const user = usersStore.get(userId)
    if (!user) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Create session
    const token = generateToken()
    const session: SessionData = {
      userId: user.id,
      username: user.username,
      email: user.email,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    }
    sessionsStore.set(token, session)

    return {
      success: true,
      user: this.toUserDto(user),
      token,
    }
  }

  /**
   * Logout user (invalidate session)
   */
  static async logout(token: string): Promise<boolean> {
    return sessionsStore.delete(token)
  }

  /**
   * Validate session and get user
   */
  static async validateSession(token: string): Promise<{ valid: boolean; user?: UserDto }> {
    const session = sessionsStore.get(token)
    
    if (!session) {
      return { valid: false }
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      sessionsStore.delete(token)
      return { valid: false }
    }

    const user = usersStore.get(session.userId)
    if (!user) {
      sessionsStore.delete(token)
      return { valid: false }
    }

    return {
      valid: true,
      user: this.toUserDto(user),
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserDto | null> {
    const user = usersStore.get(userId)
    return user ? this.toUserDto(user) : null
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: { username?: string; telegramId?: string }
  ): Promise<{ success: boolean; user?: UserDto; error?: string }> {
    const user = usersStore.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Validate username if provided
    if (updates.username) {
      if (!isValidUsername(updates.username)) {
        return { 
          success: false, 
          error: 'Username must be 3-20 characters, alphanumeric and underscores only' 
        }
      }

      // Check if username taken
      let taken = false
      usersStore.forEach((u) => {
        if (u.id !== userId && u.username.toLowerCase() === updates.username!.toLowerCase()) {
          taken = true
        }
      })
      if (taken) {
        return { success: false, error: 'Username already taken' }
      }

      user.username = updates.username
    }

    if (updates.telegramId !== undefined) {
      user.telegramId = updates.telegramId
    }

    user.updatedAt = new Date()
    usersStore.set(userId, user)

    return {
      success: true,
      user: this.toUserDto(user),
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
    const user = usersStore.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' }
    }

    // Validate new password
    const passwordCheck = isValidPassword(newPassword)
    if (!passwordCheck.valid) {
      return { success: false, error: passwordCheck.message }
    }

    // Update password
    user.passwordHash = await hashPassword(newPassword)
    user.updatedAt = new Date()
    usersStore.set(userId, user)

    // Invalidate all sessions for this user
    sessionsStore.forEach((session, token) => {
      if (session.userId === userId) {
        sessionsStore.delete(token)
      }
    })

    return { success: true }
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
    const user = usersStore.get(userId)
    if (!user) return null

    // Mock stats (in production, calculate from actual duel history)
    const wins = Math.floor(user.completedDeals * 0.55)
    const losses = user.completedDeals - wins
    
    return {
      totalDuels: user.completedDeals,
      wins,
      losses,
      winRate: user.completedDeals > 0 ? Math.round((wins / user.completedDeals) * 100) : 0,
      totalEarnings: user.pointsBalance - INITIAL_BALANCE,
      currentStreak: Math.floor(Math.random() * 5),
      reliabilityPercent: user.reliabilityPercent,
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
    const user = usersStore.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const newBalance = user.pointsBalance + amount
    if (newBalance < 0) {
      return { success: false, error: 'Insufficient balance' }
    }

    user.pointsBalance = newBalance
    user.updatedAt = new Date()
    usersStore.set(userId, user)

    // TODO: Create transaction record
    
    return {
      success: true,
      newBalance,
    }
  }

  /**
   * Convert to DTO
   */
  private static toUserDto(user: UserRecord): UserDto {
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
    
    // Check if already exists
    if (emailIndex.has(demoEmail)) {
      return this.login({ email: demoEmail, password: 'demo123' })
    }

    return this.register({
      username: 'DemoPlayer',
      email: demoEmail,
      password: 'demo123',
    })
  }
}

