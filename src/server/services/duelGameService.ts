/**
 * Duel Game Service
 * Handles individual game logic within P2P duels
 */

import { 
  GameResult, 
  DuelGameDto, 
  UserSummary,
  FairnessProof,
  CONSTANTS 
} from '../types'
import { RandomnessEngine } from './randomnessEngine'
import { P2POrderService } from './p2pOrderService'
import { ReliabilityService } from './reliabilityService'

// In-memory store (replace with Prisma)
interface DuelGameRecord {
  id: string
  orderId: string
  gameIndex: number
  playerAId: string
  playerAUsername: string
  playerBId: string
  playerBUsername: string
  result: GameResult
  winnerId: string | null
  
  // Randomness
  serverSeedHash: string | null
  serverSecretSeed: string | null
  roundNonce: string | null
  externalRandom: string | null
  randomNumber: number | null
  
  // Player inputs
  playerACode: string | null
  playerBCode: string | null
  playerASubmittedAt: Date | null
  playerBSubmittedAt: Date | null
  
  // Timing
  deadline: Date | null
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

const gamesStore: Map<string, DuelGameRecord> = new Map()

export class DuelGameService {
  /**
   * Create a new game in the duel series
   */
  static async createGame(
    orderId: string,
    gameIndex: number,
    playerAId: string,
    playerAUsername: string,
    playerBId: string,
    playerBUsername: string
  ): Promise<DuelGameDto> {
    // Generate randomness commitment
    const { source, commitment } = await RandomnessEngine.createGameRandomSource(
      orderId,
      gameIndex
    )

    const deadline = new Date(Date.now() + CONSTANTS.GAME_TIMEOUT_MS)

    const game: DuelGameRecord = {
      id: generateId(),
      orderId,
      gameIndex,
      playerAId,
      playerAUsername,
      playerBId,
      playerBUsername,
      result: 'NOT_PLAYED',
      winnerId: null,
      
      // Store randomness (secret seed hidden until game end)
      serverSeedHash: commitment,
      serverSecretSeed: source.serverSecretSeed, // Keep secret until reveal
      roundNonce: source.roundNonce,
      externalRandom: source.externalRandom,
      randomNumber: null,
      
      playerACode: null,
      playerBCode: null,
      playerASubmittedAt: null,
      playerBSubmittedAt: null,
      
      deadline,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    }

    gamesStore.set(game.id, game)

    return this.toDto(game, false) // Don't reveal secret seed yet
  }

  /**
   * Submit player code (TOTP input)
   */
  static async submitPlayerCode(
    gameId: string,
    playerId: string,
    code: string
  ): Promise<{ success: boolean; game?: DuelGameDto; error?: string }> {
    const game = gamesStore.get(gameId)

    if (!game) {
      return { success: false, error: 'Game not found' }
    }

    if (game.result !== 'NOT_PLAYED') {
      return { success: false, error: 'Game already completed' }
    }

    // Check deadline
    if (game.deadline && new Date() > game.deadline) {
      await this.handleGameTimeout(gameId)
      return { success: false, error: 'Game deadline expired' }
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return { success: false, error: 'Invalid code format (must be 6 digits)' }
    }

    // Record submission
    if (playerId === game.playerAId) {
      if (game.playerACode) {
        return { success: false, error: 'Already submitted' }
      }
      game.playerACode = code
      game.playerASubmittedAt = new Date()
    } else if (playerId === game.playerBId) {
      if (game.playerBCode) {
        return { success: false, error: 'Already submitted' }
      }
      game.playerBCode = code
      game.playerBSubmittedAt = new Date()
    } else {
      return { success: false, error: 'Player not in this game' }
    }

    gamesStore.set(gameId, game)

    // Check if both players submitted
    if (game.playerACode && game.playerBCode) {
      await this.resolveGame(gameId)
    }

    const updatedGame = gamesStore.get(gameId)!
    return {
      success: true,
      game: this.toDto(updatedGame, updatedGame.result !== 'NOT_PLAYED'),
    }
  }

  /**
   * Resolve game after both players submitted
   */
  static async resolveGame(gameId: string): Promise<void> {
    const game = gamesStore.get(gameId)
    if (!game || !game.playerACode || !game.playerBCode) return

    const playerACode = parseInt(game.playerACode, 10)
    const playerBCode = parseInt(game.playerBCode, 10)

    // Determine winner
    const result = await RandomnessEngine.determineWinner(playerACode, playerBCode)
    
    game.result = result
    game.winnerId = result === 'A_WINS' 
      ? game.playerAId 
      : result === 'B_WINS' 
        ? game.playerBId 
        : null
    game.completedAt = new Date()

    gamesStore.set(gameId, game)

    // Update order progress
    await P2POrderService.onGameCompleted(game.orderId, game.gameIndex)

    // Check if more games needed
    const order = await P2POrderService.getOrder(game.orderId)
    if (order && order.totalGamesPlayed < order.gamesPlanned) {
      // Schedule next game
      // In production, this would create the next game after a short delay
    }
  }

  /**
   * Handle game timeout
   */
  static async handleGameTimeout(gameId: string): Promise<void> {
    const game = gamesStore.get(gameId)
    if (!game) return

    const playerASubmitted = !!game.playerACode
    const playerBSubmitted = !!game.playerBCode

    if (!playerASubmitted && !playerBSubmitted) {
      // Both forfeited
      game.result = 'NOT_PLAYED'
      // Both lose stakes - transfer to system vault
      // TODO: Transfer stakes to vault
      
      // Update reliability for both
      await ReliabilityService.updateReliability(game.playerAId, 'DROPPED_BEFORE_MIN_GAMES')
      await ReliabilityService.updateReliability(game.playerBId, 'DROPPED_BEFORE_MIN_GAMES')
    } else if (!playerASubmitted) {
      // Player A forfeited
      game.result = 'FORFEITED_A'
      game.winnerId = game.playerBId
      await ReliabilityService.updateReliability(game.playerAId, 'DROPPED_BEFORE_MIN_GAMES')
    } else if (!playerBSubmitted) {
      // Player B forfeited
      game.result = 'FORFEITED_B'
      game.winnerId = game.playerAId
      await ReliabilityService.updateReliability(game.playerBId, 'DROPPED_BEFORE_MIN_GAMES')
    }

    game.completedAt = new Date()
    gamesStore.set(gameId, game)

    // Update order
    await P2POrderService.onGameCompleted(game.orderId, game.gameIndex)
  }

  /**
   * Get game by ID
   */
  static async getGame(gameId: string, revealSecrets: boolean = false): Promise<DuelGameDto | null> {
    const game = gamesStore.get(gameId)
    return game ? this.toDto(game, revealSecrets) : null
  }

  /**
   * Get all games for an order
   */
  static async getGamesForOrder(orderId: string): Promise<DuelGameDto[]> {
    const games: DuelGameDto[] = []
    
    gamesStore.forEach((game) => {
      if (game.orderId === orderId) {
        const revealSecrets = game.result !== 'NOT_PLAYED'
        games.push(this.toDto(game, revealSecrets))
      }
    })

    return games.sort((a, b) => a.gameIndex - b.gameIndex)
  }

  /**
   * Check for timed out games (background job)
   */
  static async checkTimeouts(): Promise<void> {
    const now = new Date()
    
    gamesStore.forEach(async (game) => {
      if (
        game.result === 'NOT_PLAYED' &&
        game.deadline &&
        now > game.deadline
      ) {
        await this.handleGameTimeout(game.id)
      }
    })
  }

  /**
   * Convert record to DTO
   */
  private static toDto(game: DuelGameRecord, revealSecrets: boolean): DuelGameDto {
    const playerA: UserSummary = {
      id: game.playerAId,
      username: game.playerAUsername,
      reliabilityCoefficient: 1.0,
      totalDeals: 0,
    }

    const playerB: UserSummary = {
      id: game.playerBId,
      username: game.playerBUsername,
      reliabilityCoefficient: 1.0,
      totalDeals: 0,
    }

    let fairnessProof: FairnessProof | null = null
    if (game.serverSeedHash) {
      fairnessProof = {
        serverSeedHash: game.serverSeedHash,
        roundNonce: game.roundNonce || '',
        // Only reveal after game is complete
        serverSecretSeed: revealSecrets ? game.serverSecretSeed || undefined : undefined,
        externalRandom: revealSecrets ? game.externalRandom || undefined : undefined,
        randomNumber: revealSecrets ? game.randomNumber || undefined : undefined,
      }
    }

    return {
      id: game.id,
      orderId: game.orderId,
      gameIndex: game.gameIndex,
      playerA,
      playerB,
      result: game.result,
      winnerId: game.winnerId,
      deadline: game.deadline?.toISOString() ?? null,
      createdAt: game.createdAt.toISOString(),
      completedAt: game.completedAt?.toISOString() ?? null,
      fairnessProof,
    }
  }
}

// Helper function
function generateId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

