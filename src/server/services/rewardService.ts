/**
 * Reward Service
 * Handles reward distribution after duel completion
 * 
 * RULES:
 * - Rewards are locked until MIN_GAMES_REQUIRED (2) games are played
 * - Winner gets the stake (chip value in points)
 * - If player forfeits before 2 games, they lose stake to opponent
 * - Draw = stakes returned to both players
 */

import { CHIP_VALUES, ChipType } from '../types'

// Constants
const MIN_GAMES_REQUIRED = 2

export interface DuelRewardResult {
  winnerId: string | null
  loserId: string | null
  pointsTransferred: number
  isDraw: boolean
  rewardsReleased: boolean
  message: string
}

export interface MatchScore {
  playerAId: string
  playerBId: string
  playerAWins: number
  playerBWins: number
  draws: number
  gamesPlayed: number
  gamesPlanned: number
}

export class RewardService {
  /**
   * Calculate rewards after a match is completed
   */
  static calculateMatchRewards(
    score: MatchScore,
    chipType: ChipType
  ): DuelRewardResult {
    const chipValue = CHIP_VALUES[chipType]
    const totalStake = chipValue * score.gamesPlanned

    // Check if minimum games played
    if (score.gamesPlayed < MIN_GAMES_REQUIRED) {
      return {
        winnerId: null,
        loserId: null,
        pointsTransferred: 0,
        isDraw: false,
        rewardsReleased: false,
        message: `Minimum ${MIN_GAMES_REQUIRED} games required. Played: ${score.gamesPlayed}`,
      }
    }

    // Determine overall winner
    if (score.playerAWins > score.playerBWins) {
      return {
        winnerId: score.playerAId,
        loserId: score.playerBId,
        pointsTransferred: totalStake,
        isDraw: false,
        rewardsReleased: true,
        message: `Player A wins! +${totalStake} points`,
      }
    } else if (score.playerBWins > score.playerAWins) {
      return {
        winnerId: score.playerBId,
        loserId: score.playerAId,
        pointsTransferred: totalStake,
        isDraw: false,
        rewardsReleased: true,
        message: `Player B wins! +${totalStake} points`,
      }
    } else {
      // Draw - return stakes
      return {
        winnerId: null,
        loserId: null,
        pointsTransferred: 0,
        isDraw: true,
        rewardsReleased: true,
        message: 'Match draw! Stakes returned.',
      }
    }
  }

  /**
   * Calculate penalty for forfeit before minimum games
   */
  static calculateForfeitPenalty(
    forfeitedById: string,
    otherPlayerId: string,
    chipType: ChipType,
    gamesPlayed: number
  ): DuelRewardResult {
    const chipValue = CHIP_VALUES[chipType]
    
    // If forfeited before any games, full stake goes to opponent
    if (gamesPlayed === 0) {
      return {
        winnerId: otherPlayerId,
        loserId: forfeitedById,
        pointsTransferred: chipValue * 2, // Both stakes
        isDraw: false,
        rewardsReleased: true,
        message: `Forfeit! ${otherPlayerId} wins both stakes.`,
      }
    }

    // If forfeited after 1 game, remaining games count as losses
    return {
      winnerId: otherPlayerId,
      loserId: forfeitedById,
      pointsTransferred: chipValue * 2,
      isDraw: false,
      rewardsReleased: true,
      message: `Forfeit after ${gamesPlayed} game(s). Opponent wins.`,
    }
  }

  /**
   * Check if rewards should be released
   */
  static shouldReleaseRewards(gamesPlayed: number): boolean {
    return gamesPlayed >= MIN_GAMES_REQUIRED
  }

  /**
   * Format reward message for UI
   */
  static formatRewardMessage(result: DuelRewardResult, currentUserId: string): string {
    if (!result.rewardsReleased) {
      return result.message
    }

    if (result.isDraw) {
      return '🤝 Draw! Your stake has been returned.'
    }

    if (result.winnerId === currentUserId) {
      return `🏆 You won +${result.pointsTransferred} points!`
    } else {
      return `😔 You lost ${result.pointsTransferred} points.`
    }
  }
}

