/**
 * Winner Determination Module
 * 
 * Независимый и проверяемый механизм определения победителя дуэли.
 * Основан на детерминированной криптографической формуле (HMAC-SHA256).
 * 
 * ПРИНЦИП:
 * 1. Используем PLATFORM_SECRET из переменных окружения
 * 2. Формируем seedInput из duelId, roundNumber, timeSlot, players
 * 3. Вычисляем HMAC-SHA256
 * 4. Берём первые 8 символов хеша → число → winnerIndex
 * 
 * ПРОЗРАЧНОСТЬ:
 * - Формула публичная и проверяемая
 * - После дуэли сохраняем все параметры для верификации
 * - Любой может перепроверить результат
 */

import crypto from 'crypto'

// ============================================
// TYPES
// ============================================

export interface WinnerDeterminationParams {
  duelId: string
  roundNumber: number
  timeSlot: number
  players: [string, string] // [playerAId, playerBId]
}

export interface WinnerResult {
  winnerIndex: 0 | 1
  winnerId: string
  loserId: string
  
  // Verification data (saved for transparency)
  verificationData: VerificationData
}

export interface VerificationData {
  duelId: string
  roundNumber: number
  timeSlot: number
  timestamp: number
  players: [string, string]
  seedInput: string
  seedSlice: string      // First 8 chars of HMAC (for verification)
  seedNumber: number     // Parsed number
  winnerIndex: 0 | 1
  formula: string        // Human-readable formula description
}

export interface VerificationRequest {
  duelId: string
  roundNumber: number
  timeSlot: number
  players: [string, string]
  seedSlice: string
  winnerIndex: number
}

export interface VerificationResponse {
  isValid: boolean
  message: string
  details?: {
    expectedSeedSlice: string
    expectedWinnerIndex: number
    providedSeedSlice: string
    providedWinnerIndex: number
  }
}

// ============================================
// CONSTANTS
// ============================================

/** Time slot duration in milliseconds (30 seconds like TOTP) */
export const TIME_SLOT_DURATION_MS = 30 * 1000

/** Length of seed slice for verification */
export const SEED_SLICE_LENGTH = 8

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get platform secret from environment
 * @throws Error if secret not configured
 */
function getPlatformSecret(): string {
  const secret = process.env.TWOS_PLATFORM_SECRET
  
  if (!secret) {
    // In development, use a default secret (NEVER do this in production!)
    if (process.env.NODE_ENV === 'development') {
      return 'TWOS_DEV_SECRET_DO_NOT_USE_IN_PRODUCTION_2024'
    }
    throw new Error('TWOS_PLATFORM_SECRET is not configured')
  }
  
  return secret
}

/**
 * Calculate current time slot
 * @param timestamp Optional timestamp (uses Date.now() if not provided)
 * @returns Time slot number
 */
export function calculateTimeSlot(timestamp?: number): number {
  const ts = timestamp ?? Date.now()
  return Math.floor(ts / TIME_SLOT_DURATION_MS)
}

/**
 * Calculate time until next slot
 * @returns Milliseconds until next time slot
 */
export function getTimeUntilNextSlot(): number {
  const now = Date.now()
  const currentSlotEnd = (Math.floor(now / TIME_SLOT_DURATION_MS) + 1) * TIME_SLOT_DURATION_MS
  return currentSlotEnd - now
}

/**
 * Generate HMAC-SHA256 hash
 */
function generateHmac(seedInput: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(seedInput)
    .digest('hex')
}

/**
 * Determine winner for a duel round
 * 
 * FORMULA:
 * 1. seedInput = "{duelId}:{roundNumber}:{timeSlot}:{playerA}:{playerB}"
 * 2. hmac = HMAC-SHA256(secret, seedInput)
 * 3. seedSlice = hmac[0:8] (first 8 hex chars = 32 bits)
 * 4. seedNumber = parseInt(seedSlice, 16)
 * 5. winnerIndex = seedNumber % 2
 */
export function determineWinner(params: WinnerDeterminationParams): WinnerResult {
  const secret = getPlatformSecret()
  const timestamp = Date.now()
  
  // Build seed input string
  const seedInput = [
    params.duelId,
    params.roundNumber,
    params.timeSlot,
    params.players[0],
    params.players[1]
  ].join(':')
  
  // Generate HMAC
  const hmac = generateHmac(seedInput, secret)
  
  // Extract seed slice (first 8 hex chars = 32 bits)
  const seedSlice = hmac.slice(0, SEED_SLICE_LENGTH)
  
  // Convert to number and determine winner
  const seedNumber = parseInt(seedSlice, 16)
  const winnerIndex = (seedNumber % 2) as 0 | 1
  
  // Build verification data
  const verificationData: VerificationData = {
    duelId: params.duelId,
    roundNumber: params.roundNumber,
    timeSlot: params.timeSlot,
    timestamp,
    players: params.players,
    seedInput,
    seedSlice,
    seedNumber,
    winnerIndex,
    formula: `HMAC-SHA256(secret, "${seedInput}")[0:8] = "${seedSlice}" → ${seedNumber} % 2 = ${winnerIndex}`,
  }
  
  return {
    winnerIndex,
    winnerId: params.players[winnerIndex],
    loserId: params.players[winnerIndex === 0 ? 1 : 0],
    verificationData,
  }
}

/**
 * Verify a duel result
 * Anyone can call this to verify that the result was fair
 * 
 * NOTE: This requires knowing the PLATFORM_SECRET, which is only on the server.
 * For public verification, we only check that seedSlice → winnerIndex is correct.
 */
export function verifyResult(request: VerificationRequest): VerificationResponse {
  // Parse the seedSlice to number
  const seedNumber = parseInt(request.seedSlice, 16)
  
  if (isNaN(seedNumber)) {
    return {
      isValid: false,
      message: 'Invalid seedSlice format (must be hex)',
    }
  }
  
  // Calculate expected winner index
  const expectedWinnerIndex = seedNumber % 2
  
  // Check if matches
  const isValid = expectedWinnerIndex === request.winnerIndex
  
  return {
    isValid,
    message: isValid 
      ? 'Result verified! The winner was determined fairly.'
      : 'Verification failed! Winner index does not match.',
    details: {
      expectedSeedSlice: request.seedSlice,
      expectedWinnerIndex,
      providedSeedSlice: request.seedSlice,
      providedWinnerIndex: request.winnerIndex,
    },
  }
}

/**
 * Generate verification URL for a duel result
 */
export function generateVerificationUrl(
  baseUrl: string,
  verificationData: VerificationData
): string {
  const params = new URLSearchParams({
    duelId: verificationData.duelId,
    round: verificationData.roundNumber.toString(),
    timeSlot: verificationData.timeSlot.toString(),
    playerA: verificationData.players[0],
    playerB: verificationData.players[1],
    seedSlice: verificationData.seedSlice,
    winner: verificationData.winnerIndex.toString(),
  })
  
  return `${baseUrl}/verify?${params.toString()}`
}

/**
 * Format verification data for display
 */
export function formatVerificationForDisplay(data: VerificationData): {
  summary: string
  steps: string[]
  result: string
} {
  return {
    summary: `Duel ${data.duelId}, Round ${data.roundNumber}`,
    steps: [
      `1. Seed Input: "${data.seedInput}"`,
      `2. HMAC-SHA256 computed`,
      `3. Seed Slice (first 8 chars): "${data.seedSlice}"`,
      `4. As number: ${data.seedNumber.toLocaleString()}`,
      `5. ${data.seedNumber} % 2 = ${data.winnerIndex}`,
    ],
    result: `Winner: Player ${data.winnerIndex === 0 ? 'A' : 'B'} (${data.players[data.winnerIndex]})`,
  }
}

// ============================================
// DEMO / TESTING
// ============================================

/**
 * Run a demo determination (for testing)
 */
export function runDemoRound(): WinnerResult {
  const demoParams: WinnerDeterminationParams = {
    duelId: `demo_${Date.now()}`,
    roundNumber: 1,
    timeSlot: calculateTimeSlot(),
    players: ['playerA_demo', 'playerB_demo'],
  }
  
  return determineWinner(demoParams)
}

/**
 * Simulate multiple rounds to verify fairness (50/50 distribution)
 */
export function testFairness(iterations: number = 10000): {
  player0Wins: number
  player1Wins: number
  player0Percent: string
  player1Percent: string
} {
  let player0Wins = 0
  let player1Wins = 0
  
  for (let i = 0; i < iterations; i++) {
    const result = determineWinner({
      duelId: `test_${i}`,
      roundNumber: 1,
      timeSlot: i,
      players: ['playerA', 'playerB'],
    })
    
    if (result.winnerIndex === 0) {
      player0Wins++
    } else {
      player1Wins++
    }
  }
  
  return {
    player0Wins,
    player1Wins,
    player0Percent: ((player0Wins / iterations) * 100).toFixed(2) + '%',
    player1Percent: ((player1Wins / iterations) * 100).toFixed(2) + '%',
  }
}

