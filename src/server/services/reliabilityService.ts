/**
 * Reliability Service
 * Tracks user trust/reliability metrics
 */

import { 
  ReliabilityMetrics, 
  ReliabilityEvent, 
  ReliabilityRank 
} from '../types'

// In-memory store (replace with Prisma)
interface ReliabilityRecord {
  userId: string
  username: string
  totalDeals: number
  completedDeals: number
  reliabilityCoefficient: number
  missedConfirmations: number
  droppedBeforeMinGames: number
  updatedAt: Date
}

const reliabilityStore: Map<string, ReliabilityRecord> = new Map()

export class ReliabilityService {
  /**
   * Get or create reliability metrics for a user
   */
  static async getMetrics(userId: string, username?: string): Promise<ReliabilityMetrics> {
    let record = reliabilityStore.get(userId)

    if (!record) {
      // Create new record
      record = {
        userId,
        username: username || 'Unknown',
        totalDeals: 0,
        completedDeals: 0,
        reliabilityCoefficient: 1.0, // New users start with 100%
        missedConfirmations: 0,
        droppedBeforeMinGames: 0,
        updatedAt: new Date(),
      }
      reliabilityStore.set(userId, record)
    }

    return {
      ...record,
      rank: this.calculateRank(record.reliabilityCoefficient),
    }
  }

  /**
   * Update reliability based on event
   */
  static async updateReliability(
    userId: string,
    event: ReliabilityEvent
  ): Promise<ReliabilityMetrics> {
    let record = reliabilityStore.get(userId)

    if (!record) {
      record = {
        userId,
        username: 'Unknown',
        totalDeals: 0,
        completedDeals: 0,
        reliabilityCoefficient: 1.0,
        missedConfirmations: 0,
        droppedBeforeMinGames: 0,
        updatedAt: new Date(),
      }
    }

    switch (event) {
      case 'MISSED_CONFIRMATION':
        record.totalDeals += 1
        record.missedConfirmations += 1
        // completedDeals stays the same
        break

      case 'DUEL_COMPLETED':
        record.totalDeals += 1
        record.completedDeals += 1
        break

      case 'DROPPED_BEFORE_MIN_GAMES':
        record.totalDeals += 1
        record.droppedBeforeMinGames += 1
        // completedDeals stays the same
        break
    }

    // Recalculate coefficient
    record.reliabilityCoefficient = this.calculateCoefficient(
      record.completedDeals,
      record.totalDeals
    )
    record.updatedAt = new Date()

    reliabilityStore.set(userId, record)

    return {
      ...record,
      rank: this.calculateRank(record.reliabilityCoefficient),
    }
  }

  /**
   * Calculate reliability coefficient
   */
  private static calculateCoefficient(completed: number, total: number): number {
    if (total === 0) return 1.0 // New user
    return Math.round((completed / total) * 100) / 100 // Round to 2 decimals
  }

  /**
   * Calculate reliability rank based on coefficient
   */
  private static calculateRank(coefficient: number): ReliabilityRank {
    if (coefficient >= 0.9) return 'TRUSTED'
    if (coefficient >= 0.7) return 'RELIABLE'
    if (coefficient >= 0.5) return 'AVERAGE'
    if (coefficient >= 0.3) return 'RISKY'
    return 'UNRELIABLE'
  }

  /**
   * Get rank display info
   */
  static getRankInfo(rank: ReliabilityRank): { 
    name: string
    emoji: string
    color: string
    description: string 
  } {
    const rankInfo = {
      TRUSTED: {
        name: 'Trusted',
        emoji: '⭐',
        color: 'text-accent-success',
        description: 'Excellent track record (90%+)',
      },
      RELIABLE: {
        name: 'Reliable',
        emoji: '✓',
        color: 'text-green-400',
        description: 'Good track record (70-89%)',
      },
      AVERAGE: {
        name: 'Average',
        emoji: '◐',
        color: 'text-accent-warning',
        description: 'Moderate track record (50-69%)',
      },
      RISKY: {
        name: 'Risky',
        emoji: '⚠',
        color: 'text-orange-400',
        description: 'Below average track record (30-49%)',
      },
      UNRELIABLE: {
        name: 'Unreliable',
        emoji: '✕',
        color: 'text-accent-danger',
        description: 'Poor track record (<30%)',
      },
    }

    return rankInfo[rank]
  }

  /**
   * Format reliability for display
   */
  static formatReliability(metrics: ReliabilityMetrics): string {
    const percentage = Math.round(metrics.reliabilityCoefficient * 100)
    const rankInfo = this.getRankInfo(metrics.rank)
    return `${rankInfo.emoji} ${percentage}% (${rankInfo.name})`
  }

  /**
   * Check if user is allowed to create orders
   * (e.g., might restrict users with very low reliability)
   */
  static canCreateOrder(metrics: ReliabilityMetrics): boolean {
    // Allow everyone for now, but could restrict UNRELIABLE users
    return true
  }

  /**
   * Check if user should show warning to opponent
   */
  static shouldShowWarning(metrics: ReliabilityMetrics): boolean {
    return metrics.rank === 'RISKY' || metrics.rank === 'UNRELIABLE'
  }

  /**
   * Get all users sorted by reliability
   */
  static async getLeaderboard(limit: number = 100): Promise<ReliabilityMetrics[]> {
    const users: ReliabilityMetrics[] = []
    
    reliabilityStore.forEach((record) => {
      users.push({
        ...record,
        rank: this.calculateRank(record.reliabilityCoefficient),
      })
    })

    return users
      .filter(u => u.totalDeals > 0) // Only users with activity
      .sort((a, b) => b.reliabilityCoefficient - a.reliabilityCoefficient)
      .slice(0, limit)
  }
}

