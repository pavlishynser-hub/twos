/**
 * P2P Order Service
 * Domain logic for P2P duel orders
 */

import { 
  ChipType, 
  P2POrderStatus, 
  P2POrderDto, 
  CreateOrderRequest,
  UserSummary,
  CONSTANTS,
  CHIP_VALUES
} from '../types'
import { ChipService } from './chipService'

// Simulated database (replace with Prisma in production)
interface P2POrderRecord {
  id: string
  ownerUserId: string
  ownerUsername: string
  chipType: ChipType
  chipValue: number
  gamesPlanned: number
  minGamesRequired: number
  totalGamesPlayed: number
  status: P2POrderStatus
  isRewardLocked: boolean
  matchedOpponentId: string | null
  matchedOpponentUsername: string | null
  confirmationExpiresAt: Date | null
  confirmedAt: Date | null
  currentGameIndex: number
  lockedStakeOwner: number
  lockedStakeOpponent: number
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

// In-memory store (replace with Prisma)
const ordersStore: Map<string, P2POrderRecord> = new Map()

export class P2POrderService {
  /**
   * Create a new P2P order
   */
  static async createOrder(
    userId: string,
    username: string,
    request: CreateOrderRequest
  ): Promise<{ success: boolean; order?: P2POrderDto; error?: string }> {
    // Validation
    if (!ChipService.isValidChipType(request.chipType)) {
      return { success: false, error: 'Invalid chip type' }
    }

    if (request.gamesPlanned < CONSTANTS.MIN_GAMES_PLANNED) {
      return { 
        success: false, 
        error: `Minimum ${CONSTANTS.MIN_GAMES_PLANNED} games required` 
      }
    }

    if (request.gamesPlanned > CONSTANTS.MAX_GAMES_PLANNED) {
      return { 
        success: false, 
        error: `Maximum ${CONSTANTS.MAX_GAMES_PLANNED} games allowed` 
      }
    }

    // Calculate stake
    const chipValue = CHIP_VALUES[request.chipType]
    const totalStake = chipValue * request.gamesPlanned

    // TODO: Check user balance and lock stake
    // const userBalance = await getUserBalance(userId)
    // if (userBalance < totalStake) {
    //   return { success: false, error: 'Insufficient balance' }
    // }

    // Create order
    const order: P2POrderRecord = {
      id: generateId(),
      ownerUserId: userId,
      ownerUsername: username,
      chipType: request.chipType,
      chipValue,
      gamesPlanned: request.gamesPlanned,
      minGamesRequired: CONSTANTS.MIN_GAMES_REQUIRED,
      totalGamesPlayed: 0,
      status: 'OPEN',
      isRewardLocked: true,
      matchedOpponentId: null,
      matchedOpponentUsername: null,
      confirmationExpiresAt: null,
      confirmedAt: null,
      currentGameIndex: 0,
      lockedStakeOwner: totalStake,
      lockedStakeOpponent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    }

    ordersStore.set(order.id, order)

    return {
      success: true,
      order: this.toDto(order),
    }
  }

  /**
   * Get all open orders
   */
  static async getOpenOrders(): Promise<P2POrderDto[]> {
    const orders: P2POrderDto[] = []
    
    ordersStore.forEach((order) => {
      if (order.status === 'OPEN') {
        orders.push(this.toDto(order))
      }
    })

    return orders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  /**
   * Get order by ID
   */
  static async getOrder(orderId: string): Promise<P2POrderDto | null> {
    const order = ordersStore.get(orderId)
    return order ? this.toDto(order) : null
  }

  /**
   * Join an open order (as opponent)
   */
  static async joinOrder(
    orderId: string,
    userId: string,
    username: string
  ): Promise<{ success: boolean; order?: P2POrderDto; expiresAt?: string; error?: string }> {
    const order = ordersStore.get(orderId)

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.status !== 'OPEN') {
      return { success: false, error: 'Order is not available' }
    }

    if (order.ownerUserId === userId) {
      return { success: false, error: 'Cannot join your own order' }
    }

    // TODO: Check opponent balance and lock stake
    const totalStake = order.chipValue * order.gamesPlanned

    // Update order
    const expiresAt = new Date(Date.now() + CONSTANTS.CONFIRMATION_TIMEOUT_MS)
    
    order.status = 'PENDING_CONFIRMATION'
    order.matchedOpponentId = userId
    order.matchedOpponentUsername = username
    order.confirmationExpiresAt = expiresAt
    order.lockedStakeOpponent = totalStake
    order.updatedAt = new Date()

    ordersStore.set(orderId, order)

    // TODO: Send Telegram notification to owner
    // await sendTelegramNotification(order.ownerUserId, 
    //   'Зайдите в игру: у вас появился соперник, у вас есть 2 минуты, чтобы подтвердить сражение.'
    // )

    return {
      success: true,
      order: this.toDto(order),
      expiresAt: expiresAt.toISOString(),
    }
  }

  /**
   * Confirm order (by owner)
   */
  static async confirmOrder(
    orderId: string,
    userId: string
  ): Promise<{ success: boolean; order?: P2POrderDto; error?: string }> {
    const order = ordersStore.get(orderId)

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.ownerUserId !== userId) {
      return { success: false, error: 'Only owner can confirm' }
    }

    if (order.status !== 'PENDING_CONFIRMATION') {
      return { success: false, error: 'Order is not pending confirmation' }
    }

    // Check if confirmation expired
    if (order.confirmationExpiresAt && new Date() > order.confirmationExpiresAt) {
      // Handle expiration
      await this.handleConfirmationExpired(orderId)
      return { success: false, error: 'Confirmation timeout expired' }
    }

    // Update order to IN_PROGRESS
    order.status = 'IN_PROGRESS'
    order.confirmedAt = new Date()
    order.currentGameIndex = 1
    order.updatedAt = new Date()

    ordersStore.set(orderId, order)

    // TODO: Create first game
    // const game = await DuelGameService.createGame(order)

    return {
      success: true,
      order: this.toDto(order),
    }
  }

  /**
   * Handle confirmation timeout
   */
  static async handleConfirmationExpired(orderId: string): Promise<void> {
    const order = ordersStore.get(orderId)
    if (!order) return

    // Update owner's reliability (missed confirmation)
    // await ReliabilityService.updateReliability(
    //   order.ownerUserId, 
    //   'MISSED_CONFIRMATION'
    // )

    // Reset order to OPEN and unlock opponent's stake
    order.status = 'OPEN'
    order.matchedOpponentId = null
    order.matchedOpponentUsername = null
    order.confirmationExpiresAt = null
    order.lockedStakeOpponent = 0
    order.updatedAt = new Date()

    ordersStore.set(orderId, order)
  }

  /**
   * Cancel order (by owner, only if OPEN)
   */
  static async cancelOrder(
    orderId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const order = ordersStore.get(orderId)

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    if (order.ownerUserId !== userId) {
      return { success: false, error: 'Only owner can cancel' }
    }

    if (order.status !== 'OPEN') {
      return { success: false, error: 'Can only cancel open orders' }
    }

    order.status = 'CANCELLED'
    order.updatedAt = new Date()

    // TODO: Unlock owner's stake
    // await unlockStake(userId, order.lockedStakeOwner)

    ordersStore.set(orderId, order)

    return { success: true }
  }

  /**
   * Update order after game completion
   */
  static async onGameCompleted(
    orderId: string,
    gameIndex: number
  ): Promise<void> {
    const order = ordersStore.get(orderId)
    if (!order) return

    order.totalGamesPlayed = gameIndex
    order.currentGameIndex = gameIndex + 1
    order.updatedAt = new Date()

    // Check if minimum games requirement met
    if (order.totalGamesPlayed >= order.minGamesRequired) {
      order.isRewardLocked = false
    }

    // Check if duel completed
    if (order.totalGamesPlayed >= order.gamesPlanned) {
      order.status = 'COMPLETED'
      order.completedAt = new Date()
    }

    ordersStore.set(orderId, order)
  }

  /**
   * Convert record to DTO
   */
  private static toDto(order: P2POrderRecord): P2POrderDto {
    const owner: UserSummary = {
      id: order.ownerUserId,
      username: order.ownerUsername,
      reliabilityCoefficient: 1.0, // TODO: fetch from ReliabilityService
      totalDeals: 0,
    }

    let opponent: UserSummary | null = null
    if (order.matchedOpponentId && order.matchedOpponentUsername) {
      opponent = {
        id: order.matchedOpponentId,
        username: order.matchedOpponentUsername,
        reliabilityCoefficient: 1.0,
        totalDeals: 0,
      }
    }

    return {
      id: order.id,
      owner,
      chipType: order.chipType,
      chipValue: order.chipValue,
      gamesPlanned: order.gamesPlanned,
      minGamesRequired: order.minGamesRequired,
      totalGamesPlayed: order.totalGamesPlayed,
      status: order.status,
      isRewardLocked: order.isRewardLocked,
      opponent,
      confirmationExpiresAt: order.confirmationExpiresAt?.toISOString() ?? null,
      currentGameIndex: order.currentGameIndex,
      createdAt: order.createdAt.toISOString(),
    }
  }
}

// Helper function
function generateId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

