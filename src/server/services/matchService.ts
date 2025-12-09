/**
 * Match Service
 * Handles complete duel match lifecycle with database persistence
 */

import prisma from '@/lib/prisma'
import { ChipType, CHIP_VALUES } from '../types'
import { determineWinner, calculateTimeSlot, DuelRoundParams } from './winnerDetermination'
import { RewardService, MatchScore } from './rewardService'

// Types
export interface CreateMatchInput {
  creatorId: string
  opponentId: string
  chipType: ChipType
  gamesPlanned: number
}

export interface PlayRoundInput {
  matchId: string
  playerANumber: number
  playerBNumber: number
}

export interface MatchResult {
  id: string
  status: string
  creatorId: string
  opponentId: string
  chipType: string
  gamesPlanned: number
  gamesPlayed: number
  creatorWins: number
  opponentWins: number
  draws: number
  winnerId: string | null
  pointsTransferred: number
  createdAt: Date
  finishedAt: Date | null
}

export interface RoundResult {
  roundNumber: number
  randomNumber: number
  playerANumber: number
  playerBNumber: number
  distanceA: number
  distanceB: number
  winnerId: string | null
  isDraw: boolean
  matchCompleted: boolean
  rewards?: {
    winnerId: string | null
    pointsTransferred: number
    message: string
  }
}

export class MatchService {
  /**
   * Create a new match between two players
   */
  static async createMatch(input: CreateMatchInput): Promise<MatchResult> {
    const chipValue = CHIP_VALUES[input.chipType]

    // Create match in database
    const match = await prisma.duelMatch.create({
      data: {
        creatorUserId: input.creatorId,
        opponentUserId: input.opponentId,
        gamesPlanned: input.gamesPlanned,
        gamesPlayed: 0,
        status: 'IN_PROGRESS',
        offer: {
          create: {
            creatorUserId: input.creatorId,
            chipType: input.chipType,
            chipPointsValue: chipValue,
            gamesCount: input.gamesPlanned,
            status: 'MATCHED',
          }
        }
      },
      include: {
        offer: true,
      }
    })

    // Lock stakes for both players
    await prisma.$transaction([
      prisma.user.update({
        where: { id: input.creatorId },
        data: { pointsBalance: { decrement: chipValue * input.gamesPlanned } }
      }),
      prisma.user.update({
        where: { id: input.opponentId },
        data: { pointsBalance: { decrement: chipValue * input.gamesPlanned } }
      }),
    ])

    return {
      id: match.id,
      status: match.status,
      creatorId: match.creatorUserId,
      opponentId: match.opponentUserId,
      chipType: input.chipType,
      gamesPlanned: match.gamesPlanned,
      gamesPlayed: 0,
      creatorWins: 0,
      opponentWins: 0,
      draws: 0,
      winnerId: null,
      pointsTransferred: 0,
      createdAt: match.createdAt,
      finishedAt: null,
    }
  }

  /**
   * Play a round in the match
   */
  static async playRound(input: PlayRoundInput): Promise<RoundResult> {
    // Get match
    const match = await prisma.duelMatch.findUnique({
      where: { id: input.matchId },
      include: { 
        offer: true,
        games: true,
      }
    })

    if (!match) {
      throw new Error('Match not found')
    }

    if (match.status !== 'IN_PROGRESS') {
      throw new Error('Match is not in progress')
    }

    const roundNumber = match.gamesPlayed + 1
    const timeSlot = calculateTimeSlot()

    // Determine winner using HMAC-SHA256
    const params: DuelRoundParams = {
      duelId: `${match.id}_round_${roundNumber}`,
      roundNumber,
      timeSlot,
      playerA: {
        playerId: match.creatorUserId,
        playerNumber: input.playerANumber,
      },
      playerB: {
        playerId: match.opponentUserId,
        playerNumber: input.playerBNumber,
      },
    }

    const result = determineWinner(params)

    // Create game record
    await prisma.duelGame.create({
      data: {
        matchId: match.id,
        roundIndex: roundNumber - 1,
        status: 'FINISHED',
        winnerUserId: result.winnerId,
        creatorReady: true,
        opponentReady: true,
        startedAt: new Date(),
        finishedAt: new Date(),
      }
    })

    // Update match stats
    const updateData: any = {
      gamesPlayed: { increment: 1 },
    }

    if (result.isDraw) {
      // For draws, we don't track in the simple model
    } else if (result.winnerIndex === 0) {
      // Creator wins this round
    } else {
      // Opponent wins this round
    }

    // Count wins from games
    const games = await prisma.duelGame.findMany({
      where: { matchId: match.id }
    })

    let creatorWins = 0
    let opponentWins = 0
    let draws = 0

    for (const game of games) {
      if (game.winnerUserId === match.creatorUserId) {
        creatorWins++
      } else if (game.winnerUserId === match.opponentUserId) {
        opponentWins++
      } else {
        draws++
      }
    }

    // Add current game
    if (result.isDraw) {
      draws++
    } else if (result.winnerIndex === 0) {
      creatorWins++
    } else {
      opponentWins++
    }

    const newGamesPlayed = match.gamesPlayed + 1
    const matchCompleted = newGamesPlayed >= match.gamesPlanned

    // Update match
    await prisma.duelMatch.update({
      where: { id: match.id },
      data: {
        gamesPlayed: newGamesPlayed,
        status: matchCompleted ? 'FINISHED' : 'IN_PROGRESS',
        finishedAt: matchCompleted ? new Date() : null,
        winnerId: matchCompleted 
          ? (creatorWins > opponentWins 
              ? match.creatorUserId 
              : opponentWins > creatorWins 
                ? match.opponentUserId 
                : null)
          : null,
      }
    })

    // Calculate rewards if match completed
    let rewards = undefined
    if (matchCompleted) {
      const score: MatchScore = {
        playerAId: match.creatorUserId,
        playerBId: match.opponentUserId,
        playerAWins: creatorWins,
        playerBWins: opponentWins,
        draws,
        gamesPlayed: newGamesPlayed,
        gamesPlanned: match.gamesPlanned,
      }

      const chipType = match.offer.chipType as ChipType
      const rewardResult = RewardService.calculateMatchRewards(score, chipType)

      if (rewardResult.rewardsReleased && rewardResult.winnerId) {
        // Transfer points to winner
        const totalStake = CHIP_VALUES[chipType] * match.gamesPlanned * 2

        await prisma.user.update({
          where: { id: rewardResult.winnerId },
          data: { pointsBalance: { increment: totalStake } }
        })

        // Record transaction
        await prisma.transaction.create({
          data: {
            userId: rewardResult.winnerId,
            type: 'DUEL_WIN',
            amountPoints: totalStake,
            relatedMatchId: match.id,
            description: `Won duel match`,
          }
        })
      } else if (rewardResult.isDraw) {
        // Return stakes to both players
        const stakePerPlayer = CHIP_VALUES[chipType] * match.gamesPlanned

        await prisma.$transaction([
          prisma.user.update({
            where: { id: match.creatorUserId },
            data: { pointsBalance: { increment: stakePerPlayer } }
          }),
          prisma.user.update({
            where: { id: match.opponentUserId },
            data: { pointsBalance: { increment: stakePerPlayer } }
          }),
        ])
      }

      rewards = {
        winnerId: rewardResult.winnerId,
        pointsTransferred: rewardResult.pointsTransferred,
        message: rewardResult.message,
      }
    }

    return {
      roundNumber,
      randomNumber: result.randomNumber,
      playerANumber: input.playerANumber,
      playerBNumber: input.playerBNumber,
      distanceA: result.distanceA,
      distanceB: result.distanceB,
      winnerId: result.winnerId,
      isDraw: result.isDraw,
      matchCompleted,
      rewards,
    }
  }

  /**
   * Get match by ID
   */
  static async getMatch(matchId: string): Promise<MatchResult | null> {
    const match = await prisma.duelMatch.findUnique({
      where: { id: matchId },
      include: {
        offer: true,
        games: true,
      }
    })

    if (!match) return null

    // Count wins
    let creatorWins = 0
    let opponentWins = 0
    let draws = 0

    for (const game of match.games) {
      if (game.winnerUserId === match.creatorUserId) {
        creatorWins++
      } else if (game.winnerUserId === match.opponentUserId) {
        opponentWins++
      } else {
        draws++
      }
    }

    return {
      id: match.id,
      status: match.status,
      creatorId: match.creatorUserId,
      opponentId: match.opponentUserId,
      chipType: match.offer.chipType,
      gamesPlanned: match.gamesPlanned,
      gamesPlayed: match.gamesPlayed,
      creatorWins,
      opponentWins,
      draws,
      winnerId: match.winnerId,
      pointsTransferred: match.winnerId 
        ? CHIP_VALUES[match.offer.chipType as ChipType] * match.gamesPlanned * 2 
        : 0,
      createdAt: match.createdAt,
      finishedAt: match.finishedAt,
    }
  }

  /**
   * Get user's match history
   */
  static async getUserMatches(userId: string): Promise<MatchResult[]> {
    const matches = await prisma.duelMatch.findMany({
      where: {
        OR: [
          { creatorUserId: userId },
          { opponentUserId: userId },
        ]
      },
      include: {
        offer: true,
        games: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return matches.map(match => {
      let creatorWins = 0
      let opponentWins = 0
      let draws = 0

      for (const game of match.games) {
        if (game.winnerUserId === match.creatorUserId) {
          creatorWins++
        } else if (game.winnerUserId === match.opponentUserId) {
          opponentWins++
        } else {
          draws++
        }
      }

      return {
        id: match.id,
        status: match.status,
        creatorId: match.creatorUserId,
        opponentId: match.opponentUserId,
        chipType: match.offer.chipType,
        gamesPlanned: match.gamesPlanned,
        gamesPlayed: match.gamesPlayed,
        creatorWins,
        opponentWins,
        draws,
        winnerId: match.winnerId,
        pointsTransferred: match.winnerId 
          ? CHIP_VALUES[match.offer.chipType as ChipType] * match.gamesPlanned * 2 
          : 0,
        createdAt: match.createdAt,
        finishedAt: match.finishedAt,
      }
    })
  }
}

