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
import { 
  determineWinner, 
  calculateTimeSlot,
  DuelRoundParams 
} from './winnerDetermination'
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
  
  // Randomness (new system)
  timeSlot: number | null
  seedSlice: string | null
  randomNumber: number | null
  
  // Player inputs (numbers 0-999999)
  playerANumber: number | null
  playerBNumber: number | null
  playerADistance: number | null
  playerBDistance: number | null
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
      
      // Randomness will be calculated when both players submit
      timeSlot: null,
      seedSlice: null,
      randomNumber: null,
      
      playerANumber: null,
      playerBNumber: null,
      playerADistance: null,
      playerBDistance: null,
      playerASubmittedAt: null,
      playerBSubmittedAt: null,
      
      deadline,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    }

    gamesStore.set(game.id, game)

    return this.toDto(game, false)
  }

  /**
   * Submit player number (0-999999)
   */
  static async submitPlayerNumber(
    gameId: string,
    playerId: string,
    playerNumber: number
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

    // Validate number range
    if (!Number.isInteger(playerNumber) || playerNumber < 0 || playerNumber > 999999) {
      return { success: false, error: 'Invalid number (must be 0-999999)' }
    }

    // Record submission
    if (playerId === game.playerAId) {
      if (game.playerANumber !== null) {
        return { success: false, error: 'Already submitted' }
      }
      game.playerANumber = playerNumber
      game.playerASubmittedAt = new Date()
    } else if (playerId === game.playerBId) {
      if (game.playerBNumber !== null) {
        return { success: false, error: 'Already submitted' }
      }
      game.playerBNumber = playerNumber
      game.playerBSubmittedAt = new Date()
    } else {
      return { success: false, error: 'Player not in this game' }
    }

    gamesStore.set(gameId, game)

    // Check if both players submitted
    if (game.playerANumber !== null && game.playerBNumber !== null) {
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
   * Uses new "Closest Number Wins" mechanic
   */
  static async resolveGame(gameId: string): Promise<void> {
    const game = gamesStore.get(gameId)
    if (!game || game.playerANumber === null || game.playerBNumber === null) return

    const timeSlot = calculateTimeSlot()

    // Use new winner determination
    const params: DuelRoundParams = {
      duelId: `${game.orderId}_game_${game.gameIndex}`,
      roundNumber: game.gameIndex,
      timeSlot,
      playerA: {
        playerId: game.playerAId,
        playerNumber: game.playerANumber,
      },
      playerB: {
        playerId: game.playerBId,
        playerNumber: game.playerBNumber,
      },
    }

    const result = determineWinner(params)

    // Update game with results
    game.timeSlot = timeSlot
    game.seedSlice = result.verification.seedSlice
    game.randomNumber = result.randomNumber
    game.playerADistance = result.distanceA
    game.playerBDistance = result.distanceB
    
    // Determine result
    if (result.isDraw) {
      game.result = 'DRAW'
      game.winnerId = null
    } else if (result.winnerIndex === 0) {
      game.result = 'A_WINS'
      game.winnerId = game.playerAId
    } else {
      game.result = 'B_WINS'
      game.winnerId = game.playerBId
    }
    
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

    const playerASubmitted = game.playerANumber !== null
    const playerBSubmitted = game.playerBNumber !== null

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
    if (revealSecrets && game.seedSlice) {
      fairnessProof = {
        timeSlot: game.timeSlot || 0,
        seedSlice: game.seedSlice,
        winnerIndex: game.result === 'A_WINS' ? 0 : game.result === 'B_WINS' ? 1 : -1,
        formula: `Random: ${game.randomNumber}, Distance A: ${game.playerADistance}, Distance B: ${game.playerBDistance}`,
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
