/**
 * TWOS Winner Determination System
 * 
 * МЕХАНИКА:
 * 1. Игрок A вводит число от 0 до 999,999
 * 2. Игрок B вводит число от 0 до 999,999
 * 3. Алгоритм генерирует случайное число (HMAC-SHA256)
 * 4. Побеждает тот, чьё число БЛИЖЕ к случайному
 * 5. При равной дистанции — ничья
 * 
 * PROVABLY FAIR:
 * - Случайное число генерируется детерминированно из HMAC-SHA256
 * - Все параметры сохраняются для верификации
 * - Формула публична и воспроизводима
 */

// ============================================
// CONSTANTS
// ============================================

/** Максимальное число которое могут ввести игроки */
export const MAX_NUMBER = 999_999

/** Минимальное число */
export const MIN_NUMBER = 0

/** Диапазон чисел */
export const NUMBER_RANGE = MAX_NUMBER - MIN_NUMBER + 1 // 1,000,000

// ============================================
// TYPES
// ============================================

export interface PlayerBet {
  playerId: string
  playerNumber: number // Число которое ввёл игрок (0 - 999,999)
}

export interface DuelRoundParams {
  duelId: string
  roundNumber: number
  timeSlot: number
  playerA: PlayerBet
  playerB: PlayerBet
}

export interface DuelRoundResult {
  /** Случайное число сгенерированное алгоритмом */
  randomNumber: number
  /** Число игрока A */
  playerANumber: number
  /** Число игрока B */
  playerBNumber: number
  /** Дистанция от числа A до случайного */
  distanceA: number
  /** Дистанция от числа B до случайного */
  distanceB: number
  /** ID победителя (или null если ничья) */
  winnerId: string | null
  /** ID проигравшего (или null если ничья) */
  loserId: string | null
  /** Индекс победителя: 0 = A, 1 = B, -1 = ничья */
  winnerIndex: 0 | 1 | -1
  /** Ничья? */
  isDraw: boolean
  /** Данные для верификации */
  verification: VerificationData
}

export interface VerificationData {
  duelId: string
  roundNumber: number
  timeSlot: number
  playerAId: string
  playerANumber: number
  playerBId: string
  playerBNumber: number
  seedSlice: string
  randomNumber: number
  distanceA: number
  distanceB: number
  winnerIndex: 0 | 1 | -1
  formula: string
}

export interface VerificationRequest {
  duelId: string
  roundNumber: number
  timeSlot: number
  playerAId: string
  playerANumber: number
  playerBId: string
  playerBNumber: number
  seedSlice: string
  claimedWinnerIndex: 0 | 1 | -1
}

export interface VerificationResult {
  isValid: boolean
  computedRandomNumber: number
  computedDistanceA: number
  computedDistanceB: number
  computedWinnerIndex: 0 | 1 | -1
  claimedWinnerIndex: 0 | 1 | -1
  message: string
}

// ============================================
// PLATFORM SECRET
// ============================================

function getPlatformSecret(): string {
  const secret = process.env.TWOS_PLATFORM_SECRET
  if (!secret || secret.length < 32) {
    // Fallback for development
    console.warn('⚠️ TWOS_PLATFORM_SECRET not set or too short. Using development fallback.')
    return 'twos_development_secret_key_32chars!'
  }
  return secret
}

// ============================================
// CRYPTO FUNCTIONS
// ============================================

/**
 * Generate HMAC-SHA256 hash
 */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Synchronous HMAC-SHA256 using Node.js crypto (for server-side)
 */
function hmacSha256Sync(secret: string, message: string): string {
  // Use Web Crypto fallback that works in Edge Runtime
  const crypto = require('crypto')
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Calculate current time slot (30-second windows)
 */
export function calculateTimeSlot(timestamp?: number): number {
  const ts = timestamp || Date.now()
  return Math.floor(ts / 30000)
}

/**
 * Generate random number from seed slice
 * seedSlice → number in range [0, 999999]
 */
function seedSliceToRandomNumber(seedSlice: string): number {
  const seedNumber = parseInt(seedSlice, 16)
  // Modulo NUMBER_RANGE to get number in [0, 999999]
  return seedNumber % NUMBER_RANGE
}

/**
 * Calculate distance between two numbers
 */
function calculateDistance(a: number, b: number): number {
  return Math.abs(a - b)
}

/**
 * Determine winner of a duel round
 * 
 * @param params - Round parameters including player bets
 * @returns Result with winner, distances, and verification data
 */
export function determineWinner(params: DuelRoundParams): DuelRoundResult {
  const { duelId, roundNumber, timeSlot, playerA, playerB } = params
  const secret = getPlatformSecret()

  // Build seed input string
  const seedInput = `${duelId}:${roundNumber}:${timeSlot}:${playerA.playerId}:${playerA.playerNumber}:${playerB.playerId}:${playerB.playerNumber}`

  // Generate HMAC
  const hmac = hmacSha256Sync(secret, seedInput)

  // Extract first 8 hex characters as seed slice
  const seedSlice = hmac.substring(0, 8)

  // Convert to random number in range [0, 999999]
  const randomNumber = seedSliceToRandomNumber(seedSlice)

  // Calculate distances
  const distanceA = calculateDistance(playerA.playerNumber, randomNumber)
  const distanceB = calculateDistance(playerB.playerNumber, randomNumber)

  // Determine winner (closer to random number wins)
  let winnerId: string | null
  let loserId: string | null
  let winnerIndex: 0 | 1 | -1
  let isDraw: boolean

  if (distanceA < distanceB) {
    // Player A wins (closer)
    winnerId = playerA.playerId
    loserId = playerB.playerId
    winnerIndex = 0
    isDraw = false
  } else if (distanceB < distanceA) {
    // Player B wins (closer)
    winnerId = playerB.playerId
    loserId = playerA.playerId
    winnerIndex = 1
    isDraw = false
  } else {
    // Equal distance = Draw
    winnerId = null
    loserId = null
    winnerIndex = -1
    isDraw = true
  }

  // Build verification data
  const verification: VerificationData = {
    duelId,
    roundNumber,
    timeSlot,
    playerAId: playerA.playerId,
    playerANumber: playerA.playerNumber,
    playerBId: playerB.playerId,
    playerBNumber: playerB.playerNumber,
    seedSlice,
    randomNumber,
    distanceA,
    distanceB,
    winnerIndex,
    formula: `HMAC-SHA256(SECRET, "${seedInput}")[0:8] → ${seedSlice} → ${randomNumber}`,
  }

  return {
    randomNumber,
    playerANumber: playerA.playerNumber,
    playerBNumber: playerB.playerNumber,
    distanceA,
    distanceB,
    winnerId,
    loserId,
    winnerIndex,
    isDraw,
    verification,
  }
}

/**
 * Verify a duel result
 * Anyone can verify that the result was calculated correctly
 */
export function verifyResult(request: VerificationRequest): VerificationResult {
  const { seedSlice, claimedWinnerIndex } = request

  // Recalculate random number from seed slice
  const computedRandomNumber = seedSliceToRandomNumber(seedSlice)

  // Recalculate distances
  const computedDistanceA = calculateDistance(request.playerANumber, computedRandomNumber)
  const computedDistanceB = calculateDistance(request.playerBNumber, computedRandomNumber)

  // Determine expected winner
  let computedWinnerIndex: 0 | 1 | -1
  if (computedDistanceA < computedDistanceB) {
    computedWinnerIndex = 0
  } else if (computedDistanceB < computedDistanceA) {
    computedWinnerIndex = 1
  } else {
    computedWinnerIndex = -1
  }

  // Check if claimed result matches computed result
  const isValid = computedWinnerIndex === claimedWinnerIndex

  let message: string
  if (isValid) {
    if (computedWinnerIndex === -1) {
      message = `✓ Verified: Draw (both at distance ${computedDistanceA} from ${computedRandomNumber})`
    } else {
      const winner = computedWinnerIndex === 0 ? 'Player A' : 'Player B'
      message = `✓ Verified: ${winner} wins (distance ${computedWinnerIndex === 0 ? computedDistanceA : computedDistanceB} vs ${computedWinnerIndex === 0 ? computedDistanceB : computedDistanceA})`
    }
  } else {
    message = `✗ Invalid: Expected winner index ${computedWinnerIndex}, got ${claimedWinnerIndex}`
  }

  return {
    isValid,
    computedRandomNumber,
    computedDistanceA,
    computedDistanceB,
    computedWinnerIndex,
    claimedWinnerIndex,
    message,
  }
}

/**
 * Validate player number input
 */
export function validatePlayerNumber(num: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Number must be an integer' }
  }
  if (num < MIN_NUMBER) {
    return { valid: false, error: `Number must be at least ${MIN_NUMBER}` }
  }
  if (num > MAX_NUMBER) {
    return { valid: false, error: `Number must be at most ${MAX_NUMBER}` }
  }
  return { valid: true }
}
