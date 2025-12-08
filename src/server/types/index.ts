/**
 * TWOS Backend Types
 * Core type definitions for P2P Duel System
 */

// ============================================
// CHIP SYSTEM
// ============================================

export type ChipType = 'SMILE' | 'HEART' | 'FIRE' | 'RING'

export interface ChipConfig {
  type: ChipType
  value: number
  emoji: string
  name: string
}

export const CHIP_VALUES: Record<ChipType, number> = {
  SMILE: 5,
  HEART: 10,
  FIRE: 25,
  RING: 50,
} as const

export const CHIP_CONFIGS: Record<ChipType, ChipConfig> = {
  SMILE: { type: 'SMILE', value: 5, emoji: '😊', name: 'Smile' },
  HEART: { type: 'HEART', value: 10, emoji: '❤️', name: 'Heart' },
  FIRE: { type: 'FIRE', value: 25, emoji: '🔥', name: 'Fire' },
  RING: { type: 'RING', value: 50, emoji: '💍', name: 'Ring' },
} as const

// ============================================
// P2P ORDER STATUS
// ============================================

export type P2POrderStatus = 
  | 'OPEN'
  | 'PENDING_CONFIRMATION'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'

// ============================================
// GAME RESULT
// ============================================

export type GameResult = 
  | 'A_WINS'
  | 'B_WINS'
  | 'DRAW'
  | 'NOT_PLAYED'
  | 'FORFEITED_A'
  | 'FORFEITED_B'

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

/**
 * User summary for API responses
 */
export interface UserSummary {
  id: string
  username: string
  reliabilityCoefficient: number
  totalDeals: number
}

/**
 * P2P Order DTO for API
 */
export interface P2POrderDto {
  id: string
  owner: UserSummary
  chipType: ChipType
  chipValue: number
  gamesPlanned: number
  minGamesRequired: number
  totalGamesPlayed: number
  status: P2POrderStatus
  isRewardLocked: boolean
  opponent?: UserSummary | null
  confirmationExpiresAt?: string | null
  currentGameIndex: number
  createdAt: string
}

/**
 * Create order request
 */
export interface CreateOrderRequest {
  chipType: ChipType
  gamesPlanned: number // Must be >= 2
}

/**
 * Create order response
 */
export interface CreateOrderResponse {
  success: boolean
  order?: P2POrderDto
  error?: string
}

/**
 * Join order response
 */
export interface JoinOrderResponse {
  success: boolean
  order?: P2POrderDto
  expiresAt?: string
  message?: string
  error?: string
}

/**
 * Confirm order response
 */
export interface ConfirmOrderResponse {
  success: boolean
  order?: P2POrderDto
  game?: DuelGameDto
  error?: string
}

// ============================================
// DUEL GAME DTOs
// ============================================

export interface DuelGameDto {
  id: string
  orderId: string
  gameIndex: number
  playerA: UserSummary
  playerB: UserSummary
  result: GameResult
  winnerId?: string | null
  deadline?: string | null
  createdAt: string
  completedAt?: string | null
  
  // Provably fair data (HMAC-SHA256)
  fairnessProof?: FairnessProof | null
}

export interface FairnessProof {
  /** Time slot used for calculation */
  timeSlot: number
  /** First 8 hex chars of HMAC */
  seedSlice: string
  /** Winner index (0 or 1) */
  winnerIndex: 0 | 1
  /** Verification formula */
  formula: string
}

/**
 * Game result submission (auto-resolved, no player input needed)
 */
export interface SubmitGameResultRequest {
  // Empty - winner is determined automatically by HMAC-SHA256
}

export interface SubmitGameResultResponse {
  success: boolean
  game?: DuelGameDto
  nextGame?: DuelGameDto | null
  orderCompleted?: boolean
  rewards?: RewardSummary
  error?: string
}

// ============================================
// RELIABILITY METRICS
// ============================================

export interface ReliabilityMetrics {
  userId: string
  username: string
  totalDeals: number
  completedDeals: number
  reliabilityCoefficient: number
  missedConfirmations: number
  droppedBeforeMinGames: number
  rank: ReliabilityRank
}

export type ReliabilityRank = 
  | 'TRUSTED'      // >= 90%
  | 'RELIABLE'     // >= 70%
  | 'AVERAGE'      // >= 50%
  | 'RISKY'        // >= 30%
  | 'UNRELIABLE'   // < 30%

export type ReliabilityEvent = 
  | 'MISSED_CONFIRMATION'
  | 'DUEL_COMPLETED'
  | 'DROPPED_BEFORE_MIN_GAMES'

// ============================================
// REWARDS
// ============================================

export interface RewardSummary {
  winnerId: string
  loserId?: string
  pointsWon: number
  pointsLost: number
  skinsWon?: string[]
  skinsLost?: string[]
  isDraw: boolean
}

// ============================================
// WINNER DETERMINATION (HMAC-SHA256)
// ============================================

export interface WinnerDeterminationInput {
  duelId: string
  roundNumber: number
  timeSlot: number
  players: [string, string]
}

export interface WinnerDeterminationResult {
  winnerId: string
  loserId: string
  winnerIndex: 0 | 1
  seedSlice: string
  formula: string
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface TelegramNotification {
  userId: string
  telegramId?: string
  message: string
  type: NotificationType
}

export type NotificationType = 
  | 'OPPONENT_FOUND'
  | 'CONFIRMATION_REQUIRED'
  | 'GAME_STARTED'
  | 'GAME_RESULT'
  | 'DUEL_COMPLETED'
  | 'OPPONENT_FORFEITED'
  | 'CONFIRMATION_EXPIRED'

// ============================================
// API ERROR RESPONSES
// ============================================

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError }

// ============================================
// CONSTANTS
// ============================================

export const CONSTANTS = {
  // Confirmation timeout
  CONFIRMATION_TIMEOUT_MS: 2 * 60 * 1000, // 2 minutes
  
  // Game timeout
  GAME_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
  
  // Time slot duration (for HMAC seed)
  TIME_SLOT_DURATION_MS: 30 * 1000, // 30 seconds
  
  // Minimum games required
  MIN_GAMES_REQUIRED: 2,
  
  // Minimum games planned
  MIN_GAMES_PLANNED: 2,
  
  // Maximum games planned
  MAX_GAMES_PLANNED: 10,
} as const
