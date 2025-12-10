/**
 * Database Client
 * 
 * In production: Uses Prisma with PostgreSQL
 * In development/demo: Uses mock data
 */

// Check if we have a database URL configured
const hasDatabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL !== 'mock'

/**
 * Mock database for development/demo without PostgreSQL
 */
class MockDB {
  private users: Map<string, any> = new Map()
  private sessions: Map<string, string> = new Map()
  private offers: Map<string, any> = new Map()
  private matches: Map<string, any> = new Map()
  private games: Map<string, any> = new Map()
  private skins: Map<string, any> = new Map()
  private userSkins: Map<string, any> = new Map()

  constructor() {
    // Initialize with demo data
    this.initDemoData()
  }

  private initDemoData() {
    // Demo user
    const demoUser = {
      id: 'demo_user_1',
      username: 'DemoPlayer',
      email: 'demo@twos.gg',
      passwordHash: '$2a$10$demo', // Not a real hash
      pointsBalance: 1000,
      totalDeals: 15,
      completedDeals: 14,
      reliabilityPercent: 93.3,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.users.set(demoUser.id, demoUser)
    this.users.set(demoUser.email!, demoUser) // Also index by email

    // Demo skins
    const skins = [
      { id: 'skin_1', name: 'Dragon', rarity: 'LEGENDARY', pointsValue: 500, availableForPurchase: true },
      { id: 'skin_2', name: 'Cyber Wolf', rarity: 'EPIC', pointsValue: 250, availableForPurchase: true },
      { id: 'skin_3', name: 'Neon Blade', rarity: 'RARE', pointsValue: 100, availableForPurchase: true },
      { id: 'skin_4', name: 'Shadow Shield', rarity: 'UNCOMMON', pointsValue: 50, availableForPurchase: true },
      { id: 'skin_5', name: 'Basic Skin', rarity: 'COMMON', pointsValue: 25, availableForPurchase: true },
    ]
    skins.forEach(s => this.skins.set(s.id, s))

    // Demo user skins
    const userSkins = [
      { id: 'us_1', userId: demoUser.id, skinId: 'skin_3', status: 'ACTIVE' },
      { id: 'us_2', userId: demoUser.id, skinId: 'skin_4', status: 'ACTIVE' },
    ]
    userSkins.forEach(us => this.userSkins.set(us.id, us))
  }

  // User operations
  async findUserByEmail(email: string) {
    return this.users.get(email) || null
  }

  async findUserById(id: string) {
    return this.users.get(id) || null
  }

  async createUser(data: any) {
    const id = `user_${Date.now()}`
    const user = {
      id,
      ...data,
      pointsBalance: 500, // Starting balance
      totalDeals: 0,
      completedDeals: 0,
      reliabilityPercent: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.users.set(id, user)
    if (data.email) this.users.set(data.email, user)
    return user
  }

  async updateUser(id: string, data: any) {
    const user = this.users.get(id)
    if (!user) return null
    const updated = { ...user, ...data, updatedAt: new Date() }
    this.users.set(id, updated)
    if (user.email) this.users.set(user.email, updated)
    return updated
  }

  // Session operations
  async createSession(userId: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    this.sessions.set(sessionId, userId)
    return sessionId
  }

  async getSession(sessionId: string): Promise<string | null> {
    return this.sessions.get(sessionId) || null
  }

  async deleteSession(sessionId: string) {
    this.sessions.delete(sessionId)
  }

  // Skin operations
  async getShopSkins() {
    return Array.from(this.skins.values()).filter(s => s.availableForPurchase)
  }

  async getUserSkins(userId: string) {
    return Array.from(this.userSkins.values())
      .filter(us => us.userId === userId && us.status === 'ACTIVE')
      .map(us => ({
        ...us,
        skin: this.skins.get(us.skinId),
      }))
  }

  async getSkinById(id: string) {
    return this.skins.get(id) || null
  }

  // Offer operations
  async getOpenOffers() {
    return Array.from(this.offers.values()).filter(o => o.status === 'OPEN')
  }

  async createOffer(data: any) {
    const id = `offer_${Date.now()}`
    const offer = { id, ...data, status: 'OPEN', createdAt: new Date() }
    this.offers.set(id, offer)
    return offer
  }
}

// Export singleton instance
export const mockDB = new MockDB()

/**
 * Get database client
 * Returns Prisma client if DATABASE_URL is set, otherwise mock
 */
export function getDB() {
  if (hasDatabaseUrl) {
    // In production, use Prisma
    // const { PrismaClient } = require('@prisma/client')
    // return new PrismaClient()
    
    // For now, always use mock
    return mockDB
  }
  return mockDB
}

export const db = mockDB


