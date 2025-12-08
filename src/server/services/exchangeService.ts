/**
 * Exchange Service
 * Handles Skins ↔ Points conversion
 */

import {
  UserSkinDto,
  SkinDto,
  TransactionType,
  ExchangeSkinsToPointsResponse,
  ExchangePointsToSkinResponse,
} from '../types/duel.types'

// ============================================
// IN-MEMORY STORES (Replace with Prisma)
// ============================================

interface UserRecord {
  id: string
  username: string
  pointsBalance: number
}

interface SkinRecord {
  id: string
  name: string
  description?: string
  imageUrl?: string
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  pointsValue: number
  availableForPurchase: boolean
}

interface UserSkinRecord {
  id: string
  userId: string
  skinId: string
  status: 'ACTIVE' | 'LOCKED_IN_DUEL' | 'BURNED' | 'DONATED_TO_PLATFORM' | 'CONVERTED_TO_POINTS'
  createdAt: Date
}

interface TransactionRecord {
  id: string
  userId: string
  type: TransactionType
  amountPoints: number
  description?: string
  relatedSkinId?: string
  createdAt: Date
}

// Mock data stores
const users: Map<string, UserRecord> = new Map([
  ['user_1', { id: 'user_1', username: 'Player1', pointsBalance: 1000 }],
])

const skins: Map<string, SkinRecord> = new Map([
  ['skin_dragon', { id: 'skin_dragon', name: 'Dragon', description: 'Legendary dragon skin', rarity: 'LEGENDARY', pointsValue: 500, availableForPurchase: true }],
  ['skin_wolf', { id: 'skin_wolf', name: 'Cyber Wolf', description: 'Epic cyber wolf', rarity: 'EPIC', pointsValue: 250, availableForPurchase: true }],
  ['skin_blade', { id: 'skin_blade', name: 'Neon Blade', description: 'Rare neon blade', rarity: 'RARE', pointsValue: 100, availableForPurchase: true }],
  ['skin_shield', { id: 'skin_shield', name: 'Shadow Shield', description: 'Uncommon shield', rarity: 'UNCOMMON', pointsValue: 50, availableForPurchase: true }],
  ['skin_basic', { id: 'skin_basic', name: 'Basic Skin', description: 'Common starter skin', rarity: 'COMMON', pointsValue: 25, availableForPurchase: true }],
])

const userSkins: Map<string, UserSkinRecord> = new Map([
  ['uskin_1', { id: 'uskin_1', userId: 'user_1', skinId: 'skin_blade', status: 'ACTIVE', createdAt: new Date() }],
  ['uskin_2', { id: 'uskin_2', userId: 'user_1', skinId: 'skin_shield', status: 'ACTIVE', createdAt: new Date() }],
])

const transactions: TransactionRecord[] = []

// ============================================
// EXCHANGE SERVICE
// ============================================

export class ExchangeService {
  /**
   * Convert skins to points
   * User exchanges their skins for points based on skin value
   */
  static async skinsToPoints(
    userId: string,
    userSkinIds: string[]
  ): Promise<ExchangeSkinsToPointsResponse> {
    const user = users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (userSkinIds.length === 0) {
      return { success: false, error: 'No skins selected' }
    }

    // Validate all skins
    const skinsToConvert: { userSkin: UserSkinRecord; skin: SkinRecord }[] = []
    
    for (const userSkinId of userSkinIds) {
      const userSkin = userSkins.get(userSkinId)
      
      if (!userSkin) {
        return { success: false, error: `Skin ${userSkinId} not found` }
      }
      
      if (userSkin.userId !== userId) {
        return { success: false, error: `Skin ${userSkinId} does not belong to you` }
      }
      
      if (userSkin.status !== 'ACTIVE') {
        return { success: false, error: `Skin ${userSkinId} is not available (status: ${userSkin.status})` }
      }
      
      const skin = skins.get(userSkin.skinId)
      if (!skin) {
        return { success: false, error: `Skin type not found for ${userSkinId}` }
      }
      
      skinsToConvert.push({ userSkin, skin })
    }

    // Calculate total points
    const totalPoints = skinsToConvert.reduce((sum, { skin }) => sum + skin.pointsValue, 0)

    // Perform conversion (atomic in production with Prisma transaction)
    for (const { userSkin } of skinsToConvert) {
      userSkin.status = 'CONVERTED_TO_POINTS'
      userSkins.set(userSkin.id, userSkin)
    }

    user.pointsBalance += totalPoints
    users.set(userId, user)

    // Create transaction record
    const transaction: TransactionRecord = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'SKIN_TO_POINTS',
      amountPoints: totalPoints,
      description: `Converted ${skinsToConvert.length} skin(s) to points`,
      createdAt: new Date(),
    }
    transactions.push(transaction)

    return {
      success: true,
      addedPoints: totalPoints,
      newBalance: user.pointsBalance,
      convertedSkins: userSkinIds,
    }
  }

  /**
   * Convert points to skin
   * User purchases a skin from the shop using points
   */
  static async pointsToSkin(
    userId: string,
    skinId: string
  ): Promise<ExchangePointsToSkinResponse> {
    const user = users.get(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const skin = skins.get(skinId)
    if (!skin) {
      return { success: false, error: 'Skin not found in shop' }
    }

    if (!skin.availableForPurchase) {
      return { success: false, error: 'Skin not available for purchase' }
    }

    if (user.pointsBalance < skin.pointsValue) {
      return { 
        success: false, 
        error: `Insufficient points. Need ${skin.pointsValue}, have ${user.pointsBalance}` 
      }
    }

    // Deduct points
    user.pointsBalance -= skin.pointsValue
    users.set(userId, user)

    // Create new user skin
    const newUserSkin: UserSkinRecord = {
      id: `uskin_${Date.now()}`,
      userId,
      skinId,
      status: 'ACTIVE',
      createdAt: new Date(),
    }
    userSkins.set(newUserSkin.id, newUserSkin)

    // Create transaction record
    const transaction: TransactionRecord = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'POINTS_TO_SKIN',
      amountPoints: -skin.pointsValue,
      description: `Purchased ${skin.name}`,
      relatedSkinId: skinId,
      createdAt: new Date(),
    }
    transactions.push(transaction)

    return {
      success: true,
      newUserSkin: {
        id: newUserSkin.id,
        skin: {
          id: skin.id,
          name: skin.name,
          description: skin.description,
          imageUrl: skin.imageUrl,
          rarity: skin.rarity,
          pointsValue: skin.pointsValue,
          availableForPurchase: skin.availableForPurchase,
        },
        status: newUserSkin.status,
        createdAt: newUserSkin.createdAt.toISOString(),
      },
      newBalance: user.pointsBalance,
    }
  }

  /**
   * Get available skins in shop
   */
  static async getShopSkins(): Promise<SkinDto[]> {
    const shopSkins: SkinDto[] = []
    
    skins.forEach((skin) => {
      if (skin.availableForPurchase) {
        shopSkins.push({
          id: skin.id,
          name: skin.name,
          description: skin.description,
          imageUrl: skin.imageUrl,
          rarity: skin.rarity,
          pointsValue: skin.pointsValue,
          availableForPurchase: true,
        })
      }
    })

    return shopSkins.sort((a, b) => a.pointsValue - b.pointsValue)
  }

  /**
   * Get user's skins
   */
  static async getUserSkins(userId: string): Promise<UserSkinDto[]> {
    const result: UserSkinDto[] = []
    
    userSkins.forEach((userSkin) => {
      if (userSkin.userId === userId && userSkin.status === 'ACTIVE') {
        const skin = skins.get(userSkin.skinId)
        if (skin) {
          result.push({
            id: userSkin.id,
            skin: {
              id: skin.id,
              name: skin.name,
              description: skin.description,
              imageUrl: skin.imageUrl,
              rarity: skin.rarity,
              pointsValue: skin.pointsValue,
              availableForPurchase: skin.availableForPurchase,
            },
            status: userSkin.status,
            createdAt: userSkin.createdAt.toISOString(),
          })
        }
      }
    })

    return result
  }

  /**
   * Get user's points balance
   */
  static async getUserBalance(userId: string): Promise<number> {
    const user = users.get(userId)
    return user?.pointsBalance ?? 0
  }

  /**
   * Get user's transaction history
   */
  static async getUserTransactions(userId: string): Promise<TransactionRecord[]> {
    return transactions
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

