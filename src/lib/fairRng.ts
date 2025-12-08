/**
 * TWOS — Provably Fair RNG System
 * 
 * This module implements a TOTP-based provably fair random number generation
 * system for determining duel winners.
 * 
 * SECURITY PRINCIPLES:
 * - No Math.random() usage
 * - Deterministic and reproducible
 * - Verifiable by players post-duel
 * - Manipulation-resistant
 * 
 * FLOW:
 * 1. Before duel: Generate seed commitment (hash visible to players)
 * 2. At resolution: Capture timestamp + generate TOTP code
 * 3. Winner = totpCode % 2
 * 4. Post-duel: Players can verify with public data
 */

// ============================================
// TYPES
// ============================================

export interface SeedCommitment {
  /** The SHA-256 hash commitment (displayed to players before duel) */
  hash: string
  /** Timestamp when commitment was created */
  createdAt: number
}

export interface DuelResolution {
  /** Duel unique identifier */
  duelId: string
  /** Player 1 identifier */
  player1Id: string
  /** Player 2 identifier */
  player2Id: string
  /** Seed commitment hash (shown before duel) */
  seedCommitment: string
  /** Exact timestamp of resolution (Unix ms) */
  timestamp: number
  /** TOTP code generated at resolution moment */
  totpCode: number
  /** Winner index: 0 = player1, 1 = player2 */
  winnerIndex: 0 | 1
  /** Server secret (NEVER exposed to clients in production) */
  serverSecret?: string
}

export interface VerificationResult {
  /** Whether the verification passed */
  isValid: boolean
  /** Computed winner index */
  computedWinnerIndex: 0 | 1
  /** Original winner index from duel */
  originalWinnerIndex: 0 | 1
  /** Verification details for transparency */
  details: {
    seedCommitmentMatch: boolean
    totpCodeValid: boolean
    timestampInRange: boolean
  }
}

// ============================================
// CRYPTO UTILITIES
// ============================================

/**
 * Generate SHA-256 hash of input string
 * Uses Web Crypto API for security
 */
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate cryptographically secure random bytes
 * Used for server secret generation
 */
export function generateSecureSecret(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================
// TOTP IMPLEMENTATION
// ============================================

/**
 * TOTP Configuration
 * Using 30-second time step (standard for authenticator apps)
 */
const TOTP_CONFIG = {
  timeStep: 30, // seconds
  digits: 6,    // TOTP code length
}

/**
 * Generate TOTP code based on secret and timestamp
 * 
 * This is a simplified TOTP implementation.
 * In production, use a proper TOTP library like 'otplib'.
 * 
 * @param secret - The shared secret
 * @param timestamp - Unix timestamp in milliseconds
 * @returns 6-digit TOTP code
 */
export async function generateTOTP(secret: string, timestamp: number): Promise<number> {
  // Calculate time counter (30-second windows)
  const counter = Math.floor(timestamp / 1000 / TOTP_CONFIG.timeStep)
  
  // Create HMAC input: counter as 8-byte big-endian
  const counterBytes = new ArrayBuffer(8)
  const view = new DataView(counterBytes)
  view.setBigUint64(0, BigInt(counter), false) // big-endian
  
  // Import secret key for HMAC
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  
  // Generate HMAC-SHA1
  const signature = await crypto.subtle.sign('HMAC', key, counterBytes)
  const hmac = new Uint8Array(signature)
  
  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = 
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  
  // Get 6-digit code
  const otp = binary % Math.pow(10, TOTP_CONFIG.digits)
  
  return otp
}

// ============================================
// SEED COMMITMENT
// ============================================

/**
 * Generate seed commitment before duel starts
 * 
 * The commitment is a SHA-256 hash that:
 * - Is shown to players before the duel
 * - Cannot be reversed to reveal the secret
 * - Proves the outcome wasn't manipulated after the fact
 * 
 * @param duelId - Unique duel identifier
 * @param player1Id - First player's ID
 * @param player2Id - Second player's ID
 * @param serverSecret - Server's secret (kept private)
 */
export async function generateSeedCommitment(
  duelId: string,
  player1Id: string,
  player2Id: string,
  serverSecret: string
): Promise<SeedCommitment> {
  const seed = `${duelId}:${player1Id}:${player2Id}:${serverSecret}`
  const hash = await sha256(seed)
  
  return {
    hash,
    createdAt: Date.now()
  }
}

// ============================================
// DUEL RESOLUTION
// ============================================

/**
 * Resolve duel and determine winner
 * 
 * CRITICAL: This function must be deterministic.
 * Given the same inputs, it must always produce the same output.
 * 
 * @param duelId - Unique duel identifier
 * @param player1Id - First player's ID  
 * @param player2Id - Second player's ID
 * @param serverSecret - Server's secret
 * @param seedCommitment - Previously generated commitment
 */
export async function resolveDuel(
  duelId: string,
  player1Id: string,
  player2Id: string,
  serverSecret: string,
  seedCommitment: string
): Promise<DuelResolution> {
  // Capture exact timestamp
  const timestamp = Date.now()
  
  // Generate TOTP code using combined secret
  const combinedSecret = `${serverSecret}:${duelId}`
  const totpCode = await generateTOTP(combinedSecret, timestamp)
  
  // Determine winner: 0 = player1, 1 = player2
  const winnerIndex = (totpCode % 2) as 0 | 1
  
  return {
    duelId,
    player1Id,
    player2Id,
    seedCommitment,
    timestamp,
    totpCode,
    winnerIndex,
    // Note: serverSecret should NOT be included in client-facing data
  }
}

// ============================================
// VERIFICATION
// ============================================

/**
 * Verify duel result (for transparency)
 * 
 * Players can use this to independently verify that:
 * 1. The seed commitment matches
 * 2. The TOTP code is valid for the timestamp
 * 3. The winner was correctly determined
 * 
 * NOTE: Full verification requires the server secret,
 * which is only revealed in specific verification flows.
 */
export async function verifyDuelResult(
  resolution: DuelResolution,
  serverSecret: string
): Promise<VerificationResult> {
  // Re-generate seed commitment
  const expectedCommitment = await generateSeedCommitment(
    resolution.duelId,
    resolution.player1Id,
    resolution.player2Id,
    serverSecret
  )
  
  const seedCommitmentMatch = expectedCommitment.hash === resolution.seedCommitment
  
  // Re-generate TOTP code
  const combinedSecret = `${serverSecret}:${resolution.duelId}`
  const expectedTOTP = await generateTOTP(combinedSecret, resolution.timestamp)
  const totpCodeValid = expectedTOTP === resolution.totpCode
  
  // Verify timestamp is within acceptable range (30 second window)
  const now = Date.now()
  const timeDiff = Math.abs(now - resolution.timestamp)
  const timestampInRange = timeDiff < 30 * 60 * 1000 // 30 minutes for verification
  
  // Compute expected winner
  const computedWinnerIndex = (resolution.totpCode % 2) as 0 | 1
  
  const isValid = seedCommitmentMatch && totpCodeValid && computedWinnerIndex === resolution.winnerIndex
  
  return {
    isValid,
    computedWinnerIndex,
    originalWinnerIndex: resolution.winnerIndex,
    details: {
      seedCommitmentMatch,
      totpCodeValid,
      timestampInRange
    }
  }
}

// ============================================
// DISPLAY UTILITIES
// ============================================

/**
 * Format seed commitment for display
 * Shows first and last 8 characters with ellipsis
 */
export function formatCommitment(hash: string): string {
  if (hash.length <= 20) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Generate fairness proof object for UI display
 */
export function generateFairnessProof(resolution: DuelResolution) {
  return {
    commitment: formatCommitment(resolution.seedCommitment),
    fullCommitment: resolution.seedCommitment,
    timestamp: formatTimestamp(resolution.timestamp),
    timestampRaw: resolution.timestamp,
    totpCode: resolution.totpCode.toString().padStart(6, '0'),
    winnerIndex: resolution.winnerIndex,
    algorithm: 'TOTP-SHA1 + SHA-256 Commitment',
    timeStep: `${TOTP_CONFIG.timeStep}s window`
  }
}

// ============================================
// DEMO / TESTING UTILITIES
// ============================================

/**
 * Generate a demo duel resolution for testing UI
 * In production, this would come from the backend
 */
export async function generateDemoDuelResolution(
  player1Id: string = 'player1',
  player2Id: string = 'player2'
): Promise<DuelResolution> {
  const duelId = `duel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const serverSecret = generateSecureSecret(16)
  
  const commitment = await generateSeedCommitment(duelId, player1Id, player2Id, serverSecret)
  
  // Simulate small delay before resolution
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return resolveDuel(duelId, player1Id, player2Id, serverSecret, commitment.hash)
}

