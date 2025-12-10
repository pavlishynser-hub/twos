/**
 * P2P Order Service
 * Domain logic for P2P duel orders - NOW WITH DATABASE
 */

import prisma from '@/lib/prisma'
import { DuelOfferStatus } from '@prisma/client'
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

export class P2POrderService {
  /**
   * Create a new P2P order - SAVES TO DATABASE
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

    try {
      // Check user balance
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      if (user.pointsBalance < totalStake) {
        return { success: false, error: 'Insufficient balance' }
      }

      // Create order and lock stake in transaction
      const [offer] = await prisma.$transaction([
        prisma.duelOffer.create({
          data: {
            creatorUserId: userId,
            chipType: request.chipType as ChipType,
            chipPointsValue: chipValue,
            gamesCount: request.gamesPlanned,
            status: DuelOfferStatus.OPEN,
          },
          include: {
            creator: true,
          }
        }),
        prisma.user.update({
          where: { id: userId },
          data: { pointsBalance: { decrement: totalStake } }
        }),
      ])

      return {
        success: true,
        order: this.toDto(offer, username),
      }
    } catch (error) {
      console.error('Error creating order:', error)
      return { success: false, error: 'Failed to create order' }
    }
  }

  /**
   * Get all open orders - FROM DATABASE
   */
  static async getOpenOrders(): Promise<P2POrderDto[]> {
    try {
      const offers = await prisma.duelOffer.findMany({
        where: { status: DuelOfferStatus.OPEN },
        include: { creator: true },
        orderBy: { createdAt: 'desc' },
      })

      return offers.map(offer => this.toDto(offer, offer.creator.username))
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  }

  /**
   * Get order by ID
   */
  static async getOrder(orderId: string): Promise<P2POrderDto | null> {
    try {
      const offer = await prisma.duelOffer.findUnique({
        where: { id: orderId },
        include: { creator: true },
      })

      if (!offer) return null
      return this.toDto(offer, offer.creator.username)
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  }

  /**
   * Join an open order (as opponent)
   */
  static async joinOrder(
    orderId: string,
    oderId: string,
    username: string
  ): Promise<{ success: boolean; order?: P2POrderDto; expiresAt?: string; error?: string }> {
    try {
      const offer = await prisma.duelOffer.findUnique({
        where: { id: orderId },
        include: { creator: true },
      })

      if (!offer) {
        return { success: false, error: 'Order not found' }
      }

      if (offer.status !== DuelOfferStatus.OPEN) {
        return { success: false, error: 'Order is not available' }
      }

      if (offer.creatorUserId === oderId) {
        return { success: false, error: 'Cannot join your own order' }
      }

      // Check opponent balance
      const opponent = await prisma.user.findUnique({
        where: { id: oderId }
      })

      if (!opponent) {
        return { success: false, error: 'User not found' }
      }

      const totalStake = offer.chipPointsValue * offer.gamesCount

      if (opponent.pointsBalance < totalStake) {
        return { success: false, error: 'Insufficient balance' }
      }

      const expiresAt = new Date(Date.now() + CONSTANTS.CONFIRMATION_TIMEOUT_MS)

      // Update offer and lock opponent stake
      const [updatedOffer] = await prisma.$transaction([
        prisma.duelOffer.update({
          where: { id: orderId },
          data: {
            status: DuelOfferStatus.WAITING_CREATOR_CONFIRM,
            expiresAt,
          },
          include: { creator: true },
        }),
        prisma.user.update({
          where: { id: oderId },
          data: { pointsBalance: { decrement: totalStake } }
        }),
      ])

      return {
        success: true,
        order: this.toDto(updatedOffer, updatedOffer.creator.username),
        expiresAt: expiresAt.toISOString(),
      }
    } catch (error) {
      console.error('Error joining order:', error)
      return { success: false, error: 'Failed to join order' }
    }
  }

  /**
   * Confirm order (by owner after opponent joins)
   */
  static async confirmOrder(
    orderId: string,
    userId: string
  ): Promise<{ success: boolean; order?: P2POrderDto; error?: string }> {
    try {
      const offer = await prisma.duelOffer.findUnique({
        where: { id: orderId },
        include: { creator: true },
      })

      if (!offer) {
        return { success: false, error: 'Order not found' }
      }

      if (offer.creatorUserId !== userId) {
        return { success: false, error: 'Only owner can confirm' }
      }

      if (offer.status !== DuelOfferStatus.WAITING_CREATOR_CONFIRM) {
        return { success: false, error: 'Order is not pending confirmation' }
      }

      // Check if confirmation expired
      if (offer.expiresAt && new Date() > offer.expiresAt) {
        return { success: false, error: 'Confirmation timeout expired' }
      }

      // Update to MATCHED (in progress)
      const updatedOffer = await prisma.duelOffer.update({
        where: { id: orderId },
        data: { status: DuelOfferStatus.MATCHED },
        include: { creator: true },
      })

      return {
        success: true,
        order: this.toDto(updatedOffer, updatedOffer.creator.username),
      }
    } catch (error) {
      console.error('Error confirming order:', error)
      return { success: false, error: 'Failed to confirm order' }
    }
  }

  /**
   * Cancel order (by owner, only if OPEN)
   */
  static async cancelOrder(
    orderId: string,
    oderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const offer = await prisma.duelOffer.findUnique({
        where: { id: orderId },
      })

      if (!offer) {
        return { success: false, error: 'Order not found' }
      }

      if (offer.creatorUserId !== oderId) {
        return { success: false, error: 'Only owner can cancel' }
      }

      if (offer.status !== DuelOfferStatus.OPEN) {
        return { success: false, error: 'Can only cancel open orders' }
      }

      const refund = offer.chipPointsValue * offer.gamesCount

      // Cancel and refund
      await prisma.$transaction([
        prisma.duelOffer.update({
          where: { id: orderId },
          data: { status: DuelOfferStatus.CANCELLED },
        }),
        prisma.user.update({
          where: { id: oderId },
          data: { pointsBalance: { increment: refund } }
        }),
      ])

      return { success: true }
    } catch (error) {
      console.error('Error cancelling order:', error)
      return { success: false, error: 'Failed to cancel order' }
    }
  }

  /**
   * Update order after game completion
   */
  static async onGameCompleted(
    orderId: string,
    gameIndex: number
  ): Promise<void> {
    // For now just log - full implementation later
    console.log(`Game ${gameIndex} completed for order ${orderId}`)
  }

  /**
   * Convert DB record to DTO
   */
  private static toDto(offer: any, username: string): P2POrderDto {
    const owner: UserSummary = {
      id: offer.creatorUserId,
      username: username,
      reliabilityCoefficient: 1.0,
      totalDeals: 0,
    }

    const statusMap: Record<string, P2POrderStatus> = {
      'OPEN': 'OPEN',
      'WAITING_CREATOR_CONFIRM': 'PENDING_CONFIRMATION',
      'MATCHED': 'IN_PROGRESS',
      'CANCELLED': 'CANCELLED',
      'EXPIRED': 'EXPIRED',
    }

    return {
      id: offer.id,
      owner,
      chipType: offer.chipType as ChipType,
      chipValue: offer.chipPointsValue,
      gamesPlanned: offer.gamesCount,
      minGamesRequired: CONSTANTS.MIN_GAMES_REQUIRED,
      totalGamesPlayed: 0,
      status: statusMap[offer.status] || 'OPEN',
      isRewardLocked: true,
      opponent: null,
      confirmationExpiresAt: offer.expiresAt?.toISOString() ?? null,
      currentGameIndex: 0,
      createdAt: offer.createdAt.toISOString(),
    }
  }
}
