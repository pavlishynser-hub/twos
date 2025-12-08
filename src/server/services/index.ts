/**
 * Services Index
 * Export all services from one place
 */

export { ChipService } from './chipService'
export { P2POrderService } from './p2pOrderService'
export { DuelGameService } from './duelGameService'
export { ReliabilityService } from './reliabilityService'
export { NotificationService } from './notificationService'
export { ExchangeService } from './exchangeService'
export { AuthService } from './authService'

// Winner Determination (HMAC-SHA256 + Closest Number Wins)
export { 
  determineWinner, 
  verifyResult, 
  calculateTimeSlot,
  validatePlayerNumber,
  MAX_NUMBER,
  MIN_NUMBER,
  NUMBER_RANGE,
  type PlayerBet,
  type DuelRoundParams,
  type DuelRoundResult,
  type VerificationData,
  type VerificationRequest,
  type VerificationResult,
} from './winnerDetermination'
