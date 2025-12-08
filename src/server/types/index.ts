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
  
  // Provably fair data (revealed after game)
  fairnessProof?: FairnessProof | null
}

export interface FairnessProof {
  serverSeedHash: string
  serverSecretSeed?: string // Only revealed after game
  roundNonce: string
  externalRandom?: string
  randomNumber?: number
}

/**
 * Game result submission
 */
export interface SubmitGameResultRequest {
  playerACode?: string  // TOTP code from player A
  playerBCode?: string  // TOTP code from player B
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
// RANDOMNESS ENGINE
// ============================================

export interface RandomSource {
  serverSecretSeed: string   // Revealed after the round
  serverSeedHash: string     // Published before the round
  roundNonce: string         // Unique per game (orderId + gameIndex)
  externalRandom: string     // External randomness (blockchain hash / VRF)
}

export interface RandomnessResult {
  source: RandomSource
  randomNumber: number
  modulo: number
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
  
  // TOTP input window
  TOTP_INPUT_WINDOW_MS: 10 * 1000, // 10 seconds
  
  // Minimum games required
  MIN_GAMES_REQUIRED: 2,
  
  // Minimum games planned
  MIN_GAMES_PLANNED: 2,
  
  // Maximum games planned
  MAX_GAMES_PLANNED: 10,
} as const

