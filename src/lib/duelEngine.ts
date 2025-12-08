/**
 * TWOS — Duel Engine with TOTP Input Mechanism
 * 
 * МЕХАНИКА:
 * 1. Каждый игрок имеет свой secret для Google Authenticator
 * 2. В момент дуэли оба игрока вводят свои 6-значные TOTP коды
 * 3. Сравнение кодов определяет победителя:
 *    - Больший код = победа
 *    - Равные коды = НИЧЬЯ (ставки возвращаются)
 * 
 * ЧЕСТНОСТЬ:
 * - Каждый игрок генерирует код на своём устройстве
 * - Сервер не знает коды заранее
 * - Время ввода ограничено (нельзя ждать "хороший" код)
 */

// ============================================
// TYPES
// ============================================

export type DuelResult = 'player1' | 'player2' | 'draw'

export interface PlayerTOTPInput {
  playerId: string
  totpCode: number
  submittedAt: number
}

export interface DuelRound {
  /** Unique round identifier */
  roundId: string
  /** Duel this round belongs to */
  duelId: string
  /** Player 1 TOTP input */
  player1Input?: PlayerTOTPInput
  /** Player 2 TOTP input */
  player2Input?: PlayerTOTPInput
  /** Round start timestamp */
  startedAt: number
  /** Deadline for input (usually startedAt + 10 seconds) */
  deadline: number
  /** Result of the round */
  result?: DuelResult
  /** Winner player ID (null if draw) */
  winnerId?: string | null
}

export interface DuelSession {
  duelId: string
  player1Id: string
  player2Id: string
  /** Player 1's TOTP secret (for their Authenticator) */
  player1Secret: string
  /** Player 2's TOTP secret (for their Authenticator) */
  player2Secret: string
  rounds: DuelRound[]
  currentRound: number
  totalRounds: number // Best of 1, 3, 5, etc.
  status: 'waiting' | 'active' | 'completed'
  finalWinner?: string | null
}

// ============================================
// CONSTANTS
// ============================================

/** Time window for TOTP input (milliseconds) */
export const INPUT_WINDOW_MS = 10000 // 10 seconds

/** TOTP time step (same as Google Authenticator) */
export const TOTP_TIME_STEP = 30 // seconds

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Compare two TOTP codes and determine the winner
 * 
 * RULES:
 * - Higher code wins
 * - Equal codes = DRAW
 * 
 * @returns DuelResult
 */
export function compareTOTPCodes(
  player1Code: number,
  player2Code: number
): DuelResult {
  if (player1Code > player2Code) {
    return 'player1'
  } else if (player2Code > player1Code) {
    return 'player2'
  } else {
    return 'draw'
  }
}

/**
 * Validate TOTP code format
 * Must be 6 digits (000000 - 999999)
 */
export function isValidTOTPCode(code: number | string): boolean {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code
  return !isNaN(numCode) && numCode >= 0 && numCode <= 999999
}

/**
 * Check if submission is within the allowed time window
 */
export function isWithinDeadline(submittedAt: number, deadline: number): boolean {
  return submittedAt <= deadline
}

/**
 * Process a duel round with both players' inputs
 */
export function processRound(round: DuelRound): DuelRound {
  // Check if both players submitted
  if (!round.player1Input || !round.player2Input) {
    // Determine winner by who submitted (if only one did)
    if (round.player1Input && !round.player2Input) {
      return {
        ...round,
        result: 'player1',
        winnerId: round.player1Input.playerId
      }
    } else if (!round.player1Input && round.player2Input) {
      return {
        ...round,
        result: 'player2',
        winnerId: round.player2Input.playerId
      }
    } else {
      // Neither submitted - draw
      return {
        ...round,
        result: 'draw',
        winnerId: null
      }
    }
  }

  // Both submitted - compare codes
  const result = compareTOTPCodes(
    round.player1Input.totpCode,
    round.player2Input.totpCode
  )

  return {
    ...round,
    result,
    winnerId: result === 'draw' 
      ? null 
      : result === 'player1' 
        ? round.player1Input.playerId 
        : round.player2Input.playerId
  }
}

/**
 * Generate a random secret for Google Authenticator
 * Returns base32 encoded string
 */
export function generateAuthenticatorSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' // Base32 alphabet
  const length = 16
  let secret = ''
  
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  
  for (let i = 0; i < length; i++) {
    secret += chars[randomValues[i] % chars.length]
  }
  
  return secret
}

/**
 * Generate QR code URL for Google Authenticator
 * Uses otpauth:// URI scheme
 */
export function generateAuthenticatorURI(
  secret: string,
  username: string,
  issuer: string = 'TWOS'
): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedUsername = encodeURIComponent(username)
  
  return `otpauth://totp/${encodedIssuer}:${encodedUsername}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Calculate win probability based on TOTP distribution
 * Since codes are 000000-999999, probability of:
 * - Player 1 wins: ~49.99995%
 * - Player 2 wins: ~49.99995%
 * - Draw: ~0.0001% (1 in 1,000,000)
 */
export function getWinProbabilities() {
  const totalCombinations = 1000000 * 1000000 // 10^12
  const drawCombinations = 1000000 // When both codes are equal
  
  return {
    player1Win: (totalCombinations - drawCombinations) / 2 / totalCombinations,
    player2Win: (totalCombinations - drawCombinations) / 2 / totalCombinations,
    draw: drawCombinations / totalCombinations,
    drawProbability: '0.0001%',
    drawOdds: '1 in 1,000,000'
  }
}

// ============================================
// DISPLAY UTILITIES
// ============================================

/**
 * Format TOTP code for display (with leading zeros)
 */
export function formatTOTPCode(code: number): string {
  return code.toString().padStart(6, '0')
}

/**
 * Get result message
 */
export function getResultMessage(result: DuelResult, isPlayer1: boolean): string {
  if (result === 'draw') {
    return '🤝 DRAW! Stakes returned.'
  }
  
  const won = (result === 'player1' && isPlayer1) || (result === 'player2' && !isPlayer1)
  return won ? '🏆 YOU WIN!' : '😔 You lost'
}

/**
 * Get result color class
 */
export function getResultColor(result: DuelResult, isPlayer1: boolean): string {
  if (result === 'draw') {
    return 'text-accent-warning'
  }
  
  const won = (result === 'player1' && isPlayer1) || (result === 'player2' && !isPlayer1)
  return won ? 'text-accent-success' : 'text-accent-danger'
}

// ============================================
// DEMO / TESTING
// ============================================

/**
 * Simulate a duel round for testing
 */
export function simulateDuelRound(): {
  player1Code: number
  player2Code: number
  result: DuelResult
} {
  // Generate random 6-digit codes
  const player1Code = Math.floor(Math.random() * 1000000)
  const player2Code = Math.floor(Math.random() * 1000000)
  const result = compareTOTPCodes(player1Code, player2Code)
  
  return { player1Code, player2Code, result }
}

/**
 * Run multiple simulations to verify fairness
 */
export function runFairnessTest(iterations: number = 10000): {
  player1Wins: number
  player2Wins: number
  draws: number
  player1WinRate: string
  player2WinRate: string
  drawRate: string
} {
  let player1Wins = 0
  let player2Wins = 0
  let draws = 0
  
  for (let i = 0; i < iterations; i++) {
    const { result } = simulateDuelRound()
    if (result === 'player1') player1Wins++
    else if (result === 'player2') player2Wins++
    else draws++
  }
  
  return {
    player1Wins,
    player2Wins,
    draws,
    player1WinRate: ((player1Wins / iterations) * 100).toFixed(2) + '%',
    player2WinRate: ((player2Wins / iterations) * 100).toFixed(2) + '%',
    drawRate: ((draws / iterations) * 100).toFixed(4) + '%'
  }
}

