/**
 * Randomness Engine
 * Provably fair random number generation for duels
 * 
 * DESIGN:
 * 1. Before game: Server commits to serverSeedHash (SHA256 of serverSecretSeed)
 * 2. During game: Players submit their inputs (TOTP codes)
 * 3. After game: Server reveals serverSecretSeed
 * 4. Anyone can verify: hash(serverSecretSeed) === serverSeedHash
 * 
 * For external randomness, in production use:
 * - Blockchain block hash
 * - VRF (Verifiable Random Function)
 * - drand (distributed randomness beacon)
 */

import { RandomSource, RandomnessResult } from '../types'

export class RandomnessEngine {
  /**
   * Generate cryptographic hash (SHA-256)
   */
  static async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate a secure random seed
   */
  static generateSecretSeed(length: number = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Create a committed seed (hash for pre-commitment)
   */
  static async createCommitment(secretSeed: string): Promise<string> {
    return this.sha256(secretSeed)
  }

  /**
   * Generate round nonce (unique per game)
   */
  static generateRoundNonce(orderId: string, gameIndex: number): string {
    return `${orderId}:game_${gameIndex}:${Date.now()}`
  }

  /**
   * Get external randomness
   * In production, this would fetch from blockchain/VRF
   */
  static async getExternalRandom(): Promise<string> {
    // STUB: Generate pseudo-random for development
    // In production, replace with actual external source:
    // - Ethereum block hash
    // - Chainlink VRF
    // - drand beacon
    
    const timestamp = Date.now()
    const random = crypto.getRandomValues(new Uint8Array(32))
    const combined = `${timestamp}:${Array.from(random).join(',')}`
    return this.sha256(combined)
  }

  /**
   * Generate random number from multiple sources
   * This is the core provably fair algorithm
   */
  static async generateRandomNumber(
    source: RandomSource,
    modulo: number
  ): Promise<RandomnessResult> {
    // Combine all sources
    const combinedInput = [
      source.serverSecretSeed,
      source.roundNonce,
      source.externalRandom,
    ].join(':')

    // Hash the combined input
    const hash = await this.sha256(combinedInput)

    // Convert first 8 bytes of hash to number
    const hexSubstring = hash.substring(0, 16)
    const bigNumber = BigInt('0x' + hexSubstring)
    
    // Apply modulo
    const randomNumber = Number(bigNumber % BigInt(modulo))

    return {
      source,
      randomNumber,
      modulo,
    }
  }

  /**
   * Create a complete random source for a game
   */
  static async createGameRandomSource(
    orderId: string,
    gameIndex: number
  ): Promise<{ source: RandomSource; commitment: string }> {
    const serverSecretSeed = this.generateSecretSeed()
    const serverSeedHash = await this.createCommitment(serverSecretSeed)
    const roundNonce = this.generateRoundNonce(orderId, gameIndex)
    const externalRandom = await this.getExternalRandom()

    const source: RandomSource = {
      serverSecretSeed,
      serverSeedHash,
      roundNonce,
      externalRandom,
    }

    return {
      source,
      commitment: serverSeedHash, // This is published before the game
    }
  }

  /**
   * Verify a random result
   * Returns true if the result can be verified
   */
  static async verifyResult(
    source: RandomSource,
    claimedRandomNumber: number,
    modulo: number
  ): Promise<{ valid: boolean; reason?: string }> {
    // 1. Verify commitment
    const computedHash = await this.sha256(source.serverSecretSeed)
    if (computedHash !== source.serverSeedHash) {
      return { 
        valid: false, 
        reason: 'Server seed hash does not match commitment' 
      }
    }

    // 2. Recompute random number
    const result = await this.generateRandomNumber(source, modulo)
    
    if (result.randomNumber !== claimedRandomNumber) {
      return { 
        valid: false, 
        reason: `Random number mismatch: expected ${result.randomNumber}, got ${claimedRandomNumber}` 
      }
    }

    return { valid: true }
  }

  /**
   * Determine winner from two TOTP codes
   * Uses deterministic comparison with provably fair tiebreaker
   */
  static async determineWinner(
    playerACode: number,
    playerBCode: number,
    tiebreakSource?: RandomSource
  ): Promise<'A_WINS' | 'B_WINS' | 'DRAW'> {
    // Simple comparison: higher code wins
    if (playerACode > playerBCode) {
      return 'A_WINS'
    } else if (playerBCode > playerACode) {
      return 'B_WINS'
    } else {
      // Exact match - DRAW
      // In the rare case of a draw, we could use tiebreakSource
      // but per requirements, equal codes = DRAW
      return 'DRAW'
    }
  }

  /**
   * Format verification data for display/storage
   */
  static formatVerificationData(source: RandomSource, result: number): {
    preGame: { commitment: string; roundNonce: string }
    postGame: { 
      serverSecretSeed: string
      externalRandom: string
      result: number
      verificationSteps: string[]
    }
  } {
    return {
      preGame: {
        commitment: source.serverSeedHash,
        roundNonce: source.roundNonce,
      },
      postGame: {
        serverSecretSeed: source.serverSecretSeed,
        externalRandom: source.externalRandom,
        result,
        verificationSteps: [
          `1. Verify: SHA256("${source.serverSecretSeed}") === "${source.serverSeedHash}"`,
          `2. Combine: "${source.serverSecretSeed}:${source.roundNonce}:${source.externalRandom}"`,
          `3. Hash combined string with SHA256`,
          `4. Take first 16 hex chars, convert to number`,
          `5. Apply modulo to get final result: ${result}`,
        ],
      },
    }
  }
}

