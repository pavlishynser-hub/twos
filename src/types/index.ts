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
// PROVABLY FAIR TYPES
// ============================================

/**
 * Fairness data attached to each duel
 * This data is used for verification
 */
export interface DuelFairnessData {
  /** SHA-256 commitment hash (shown before duel starts) */
  seedCommitment: string
  /** Exact resolution timestamp (Unix ms) */
  timestamp: number
  /** TOTP code generated at resolution */
  totpCode: number
  /** Winner index derived from totpCode % 2 */
  winnerIndex: 0 | 1
  /** Algorithm description for transparency */
  algorithm: string
  /** Time window used for TOTP */
  timeStep: string
}

/**
 * Extended Duel type with fairness data
 */
export interface DuelWithFairness extends Duel {
  fairness?: DuelFairnessData
}

/**
 * Verification request/response
 */
export interface VerificationRequest {
  duelId: string
  seedCommitment: string
  timestamp: number
  totpCode: number
}

export interface VerificationResponse {
  isValid: boolean
  message: string
  computedWinner: 0 | 1
  details?: {
    commitmentVerified: boolean
    totpVerified: boolean
    winnerCorrect: boolean
  }
}

