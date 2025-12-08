/**
 * Duel Types
 * Complete type definitions for P2P duel system
 */

// ============================================
// ENUMS
// ============================================

export type ChipType = 'SMILE' | 'HEART' | 'FIRE' | 'RING'

export type SkinRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type UserSkinStatus = 
  | 'ACTIVE' 
  | 'LOCKED_IN_DUEL' 
  | 'BURNED' 
  | 'DONATED_TO_PLATFORM'
  | 'CONVERTED_TO_POINTS'

export type DuelOfferStatus = 
  | 'OPEN' 
  | 'WAITING_CREATOR_CONFIRM' 
  | 'MATCHED' 
  | 'CANCELLED' 
  | 'EXPIRED'

export type DuelMatchStatus = 
  | 'AWAITING_CREATOR_CONFIRM'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELLED'
  | 'CREATOR_NO_SHOW'
  | 'BOTH_ABANDONED'

export type DuelGameStatus = 
  | 'PENDING'
  | 'AWAITING_READY'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELLED'
  | 'FORFEITED'

export type DuelBetStatus = 
  | 'LOCKED'
  | 'WON'
  | 'LOST'
  | 'BURNED_TO_PLATFORM'
  | 'RETURNED'

export type TransactionType = 
  | 'POINTS_TO_SKIN'
  | 'SKIN_TO_POINTS'
  | 'DUEL_WIN'
  | 'DUEL_LOSS'
  | 'PENALTY'
  | 'DONATION'
  | 'BONUS'
  | 'INITIAL_BALANCE'

// ============================================
// CHIP CONFIGURATION
// ============================================

export interface ChipConfig {
  type: ChipType
  pointsValue: number
  emoji: string
  name: string
  color: string
}

export const CHIP_CONFIGS: Record<ChipType, ChipConfig> = {
  SMILE: { type: 'SMILE', pointsValue: 5, emoji: '😊', name: 'Smile', color: 'text-yellow-400' },
  HEART: { type: 'HEART', pointsValue: 10, emoji: '❤️', name: 'Heart', color: 'text-red-400' },
  FIRE: { type: 'FIRE', pointsValue: 25, emoji: '🔥', name: 'Fire', color: 'text-orange-400' },
  RING: { type: 'RING', pointsValue: 50, emoji: '💍', name: 'Ring', color: 'text-purple-400' },
} as const

// ============================================
// DTOs
// ============================================

export interface UserDto {
  id: string
  username: string
  pointsBalance: number
  totalDeals: number
  completedDeals: number
  reliabilityPercent: number
}

export interface SkinDto {
  id: string
  name: string
  description?: string
  imageUrl?: string
  rarity: SkinRarity
  pointsValue: number
  availableForPurchase: boolean
}

export interface UserSkinDto {
  id: string
  skin: SkinDto
  status: UserSkinStatus
  createdAt: string
}

export interface DuelOfferDto {
  id: string
  creator: UserDto
  chipType: ChipType
  chipPointsValue: number
  gamesCount: number
  status: DuelOfferStatus
  createdAt: string
  expiresAt?: string
}

export interface DuelMatchDto {
  id: string
  offer: DuelOfferDto
  creator: UserDto
  opponent: UserDto
  gamesPlanned: number
  gamesPlayed: number
  status: DuelMatchStatus
  creatorConfirmDeadline?: string
  winnerId?: string
  createdAt: string
}

export interface DuelGameDto {
  id: string
  matchId: string
  roundIndex: number
  status: DuelGameStatus
  roundHashCommit?: string
  roundSecret?: string // Only revealed after game
  creatorReady: boolean
  opponentReady: boolean
  winnerUserId?: string
  createdAt: string
}

export interface TransactionDto {
  id: string
  type: TransactionType
  amountPoints: number
  description?: string
  createdAt: string
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateOfferRequest {
  chipType: ChipType
  gamesCount: number
}

export interface CreateOfferResponse {
  success: boolean
  offer?: DuelOfferDto
  error?: string
}

export interface AcceptOfferResponse {
  success: boolean
  match?: DuelMatchDto
  confirmDeadline?: string
  error?: string
}

export interface ConfirmMatchResponse {
  success: boolean
  match?: DuelMatchDto
  firstGame?: DuelGameDto
  error?: string
}

export interface ReadyForGameResponse {
  success: boolean
  game?: DuelGameDto
  bothReady?: boolean
  error?: string
}

export interface GameResultResponse {
  success: boolean
  game?: DuelGameDto
  match?: DuelMatchDto
  isMatchComplete?: boolean
  error?: string
}

// Exchange types
export interface ExchangeSkinsToPointsRequest {
  userSkinIds: string[]
}

export interface ExchangeSkinsToPointsResponse {
  success: boolean
  addedPoints?: number
  newBalance?: number
  convertedSkins?: string[]
  error?: string
}

export interface ExchangePointsToSkinRequest {
  skinId: string
}

export interface ExchangePointsToSkinResponse {
  success: boolean
  newUserSkin?: UserSkinDto
  newBalance?: number
  error?: string
}

// ============================================
// CONSTANTS
// ============================================

export const DUEL_CONSTANTS = {
  MIN_GAMES_COUNT: 2,
  MAX_GAMES_COUNT: 10,
  CONFIRM_TIMEOUT_MS: 2 * 60 * 1000, // 2 minutes
  READY_TIMEOUT_MS: 60 * 1000, // 1 minute for subsequent games
  GAME_TIMEOUT_MS: 30 * 1000, // 30 seconds per game
} as const

