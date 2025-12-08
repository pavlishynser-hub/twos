// User types
export interface User {
  id: string
  username: string
  avatar?: string
  rating: number
  totalDuels: number
  wins: number
  losses: number
  trustScore: number // 0-100
}

// Skin types
export interface Skin {
  id: string
  name: string
  image: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  value: number // in points
}

// Duel types
export type DuelStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export interface Duel {
  id: string
  creator: User
  opponent?: User
  stake: {
    type: 'skin' | 'points'
    skin?: Skin
    amount?: number
  }
  status: DuelStatus
  winner?: User
  createdAt: Date
  expiresAt: Date
}

// Inventory item
export interface InventoryItem {
  skin: Skin
  acquiredAt: Date
  source: 'win' | 'purchase' | 'bonus'
}

// Stats
export interface UserStats {
  totalDuels: number
  wins: number
  losses: number
  winRate: number
  currentStreak: number
  bestStreak: number
  totalEarnings: number
}

// ============================================
// PROVABLY FAIR TYPES (HMAC-SHA256)
// ============================================

/**
 * Verification data for a duel round
 */
export interface DuelVerificationData {
  /** Duel ID + round combination */
  duelId: string
  /** Round number */
  roundNumber: number
  /** Time slot (Math.floor(timestamp / 30000)) */
  timeSlot: number
  /** Player IDs in order [A, B] */
  players: [string, string]
  /** First 8 hex chars of HMAC */
  seedSlice: string
  /** Winner index: 0 = player A, 1 = player B */
  winnerIndex: 0 | 1
  /** Human-readable formula */
  formula: string
}

/**
 * Extended Duel type with verification data
 */
export interface DuelWithVerification extends Duel {
  verification?: DuelVerificationData
}

/**
 * Result of a duel round
 */
export type DuelOutcome = 'player1' | 'player2' | 'draw'

/**
 * Duel round result
 */
export interface DuelRoundResult {
  roundId: string
  roundNumber: number
  winnerId: string
  winnerIndex: 0 | 1
  verification: DuelVerificationData
  timestamp: number
}
