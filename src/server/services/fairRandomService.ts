/**
 * Fair Random Service
 * Provably fair random number generation for duel outcomes
 * 
 * FLOW:
 * 1. Before game: generateRoundCommit() → returns hash commitment
 * 2. Show hash to players (they can't know the secret)
 * 3. After game: reveal secret, players verify hash(secret) === commitment
 * 4. Winner = sha256(secret) % 2 → 0 = player1, 1 = player2
 */

export interface RoundCommitment {
  roundSecret: string      // Keep secret until reveal
  roundHashCommit: string  // Show to players before game
}

export interface RoundResult {
  winner: 'creator' | 'opponent'
  winnerIndex: 0 | 1
  roundSecret: string
  roundHashCommit: string
  verificationSteps: string[]
}

export class FairRandomService {
  /**
   * Generate SHA-256 hash
   */
  private static async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate secure random string
   */
  private static generateRandomString(length: number = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate round commitment
   * Creates a secret and its hash commitment
   * 
   * @param matchId - Duel match ID
   * @param roundIndex - Game round index (0, 1, 2...)
   * @returns Secret and hash commitment
   */
  static async generateRoundCommit(
    matchId: string,
    roundIndex: number
  ): Promise<RoundCommitment> {
    // Generate unique secret
    const timestamp = Date.now()
    const randomPart = this.generateRandomString(16)
    const roundSecret = `${matchId}:round_${roundIndex}:${timestamp}:${randomPart}`
    
    // Create hash commitment
    const roundHashCommit = await this.sha256(roundSecret)
    
    return {
      roundSecret,
      roundHashCommit,
    }
  }

  /**
   * Resolve round winner
   * Deterministically determines winner from the secret
   * 
   * @param roundSecret - The revealed secret
   * @param creatorId - Creator's user ID
   * @param opponentId - Opponent's user ID
   * @returns Winner determination with verification data
   */
  static async resolveRoundWinner(
    roundSecret: string,
    creatorId: string,
    opponentId: string
  ): Promise<RoundResult> {
    // Hash the secret
    const hash = await this.sha256(roundSecret)
    
    // Convert first 8 bytes of hash to big integer
    const hexSubstring = hash.substring(0, 16)
    const bigNumber = BigInt('0x' + hexSubstring)
    
    // Determine winner: 0 = creator, 1 = opponent
    const winnerIndex = Number(bigNumber % 2n) as 0 | 1
    const winner = winnerIndex === 0 ? 'creator' : 'opponent'
    
    return {
      winner,
      winnerIndex,
      roundSecret,
      roundHashCommit: hash,
      verificationSteps: [
        `1. Round secret: "${roundSecret}"`,
        `2. SHA256(secret) = "${hash}"`,
        `3. Take first 16 hex chars: "${hexSubstring}"`,
        `4. Convert to number: ${bigNumber.toString()}`,
        `5. Result mod 2 = ${winnerIndex}`,
        `6. Winner: ${winner} (${winnerIndex === 0 ? creatorId : opponentId})`,
      ],
    }
  }

  /**
   * Verify a round result
   * Anyone can verify that the result was fair
   * 
   * @param roundSecret - The revealed secret
   * @param claimedHashCommit - The hash that was shown before game
   * @param claimedWinnerIndex - The claimed winner (0 or 1)
   * @returns Verification result
   */
  static async verifyRoundResult(
    roundSecret: string,
    claimedHashCommit: string,
    claimedWinnerIndex: 0 | 1
  ): Promise<{ valid: boolean; reason?: string }> {
    // 1. Verify hash commitment
    const computedHash = await this.sha256(roundSecret)
    if (computedHash !== claimedHashCommit) {
      return {
        valid: false,
        reason: `Hash mismatch: computed "${computedHash}" but claimed "${claimedHashCommit}"`,
      }
    }

    // 2. Verify winner calculation
    const hexSubstring = computedHash.substring(0, 16)
    const bigNumber = BigInt('0x' + hexSubstring)
    const expectedWinnerIndex = Number(bigNumber % 2n)
    
    if (expectedWinnerIndex !== claimedWinnerIndex) {
      return {
        valid: false,
        reason: `Winner mismatch: computed ${expectedWinnerIndex} but claimed ${claimedWinnerIndex}`,
      }
    }

    return { valid: true }
  }

  /**
   * Format verification data for UI display
   */
  static formatVerificationForDisplay(result: RoundResult): {
    preGame: { commitment: string; message: string }
    postGame: { secret: string; hash: string; calculation: string; winner: string }
  } {
    return {
      preGame: {
        commitment: result.roundHashCommit,
        message: 'This hash was shown before the game started. It commits to the outcome without revealing it.',
      },
      postGame: {
        secret: result.roundSecret,
        hash: result.roundHashCommit,
        calculation: `SHA256("${result.roundSecret}") mod 2 = ${result.winnerIndex}`,
        winner: result.winner,
      },
    }
  }

  /**
   * Generate multiple commitments for a match
   * Useful for pre-generating all rounds
   */
  static async generateMatchCommitments(
    matchId: string,
    gamesCount: number
  ): Promise<RoundCommitment[]> {
    const commitments: RoundCommitment[] = []
    
    for (let i = 0; i < gamesCount; i++) {
      const commitment = await this.generateRoundCommit(matchId, i)
      commitments.push(commitment)
    }
    
    return commitments
  }
}

