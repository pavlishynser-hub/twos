/**
 * Duel Result Service
 * Handles saving duel results and awarding prizes
 */

import prisma from '@/lib/prisma'
import { TransactionType } from '@prisma/client'

interface GameResult {
  matchId: string
  roundIndex: number
  winnerId: string
  loserId: string
  isDraw: boolean
  pointsAtStake: number
  
  // Fairness proof
  seedSlice: string
  randomNumber: number
  winnerNumber: number
  loserNumber: number
}

interface MatchResult {
  matchId: string
  winnerId: string | null
  loserId: string | null
  totalGames: number
  winnerGames: number
  loserGames: number
  draws: number
  totalPointsWon: number
}

export class DuelResultService {
  /**
   * Record a single game result
   */
  static async recordGameResult(result: GameResult): Promise<void> {
    const { matchId, roundIndex, winnerId, loserId, isDraw, pointsAtStake, seedSlice, randomNumber, winnerNumber, loserNumber } = result

    await prisma.$transaction(async (tx) => {
      // Update the game record
      await tx.duelGame.update({
        where: {
          matchId_roundIndex: {
            matchId,
            roundIndex,
          },
        },
        data: {
          status: 'FINISHED',
          winnerUserId: isDraw ? null : winnerId,
          roundSecret: `${seedSlice}:${randomNumber}:${winnerNumber}:${loserNumber}`,
          finishedAt: new Date(),
        },
      })

      // Update match games played count
      await tx.duelMatch.update({
        where: { id: matchId },
        data: {
          gamesPlayed: { increment: 1 },
        },
      })
    })
  }

  /**
   * Complete a match and award prizes
   * Called after minimum 2 games are completed
   */
  static async completeMatch(matchId: string): Promise<MatchResult | null> {
    const match = await prisma.duelMatch.findUnique({
      where: { id: matchId },
      include: {
        games: true,
        offer: true,
        creator: true,
        opponent: true,
        bets: true,
      },
    })

    if (!match) return null

    // Count wins for each player
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

    // Determine overall winner
    let winnerId: string | null = null
    let loserId: string | null = null

    if (creatorWins > opponentWins) {
      winnerId = match.creatorUserId
      loserId = match.opponentUserId
    } else if (opponentWins > creatorWins) {
      winnerId = match.opponentUserId
      loserId = match.creatorUserId
    }
    // If equal, it's a draw - no winner

    const pointsPerGame = match.offer.chipPointsValue
    const totalPointsAtStake = pointsPerGame * match.gamesPlayed

    // Award prizes in a transaction
    await prisma.$transaction(async (tx) => {
      if (winnerId && loserId) {
        // Transfer points from loser to winner
        const pointsWon = totalPointsAtStake

        // Deduct from loser
        await tx.user.update({
          where: { id: loserId },
          data: {
            pointsBalance: { decrement: pointsWon },
            totalDeals: { increment: 1 },
          },
        })

        // Add to winner
        await tx.user.update({
          where: { id: winnerId },
          data: {
            pointsBalance: { increment: pointsWon },
            totalDeals: { increment: 1 },
            completedDeals: { increment: 1 },
          },
        })

        // Record transactions
        await tx.transaction.create({
          data: {
            userId: winnerId,
            type: TransactionType.DUEL_WIN,
            amountPoints: pointsWon,
            relatedMatchId: matchId,
            description: `Won duel: ${creatorWins > opponentWins ? creatorWins : opponentWins}-${creatorWins > opponentWins ? opponentWins : creatorWins}`,
          },
        })

        await tx.transaction.create({
          data: {
            userId: loserId,
            type: TransactionType.DUEL_LOSS,
            amountPoints: -pointsWon,
            relatedMatchId: matchId,
            description: `Lost duel: ${creatorWins > opponentWins ? opponentWins : creatorWins}-${creatorWins > opponentWins ? creatorWins : opponentWins}`,
          },
        })

        // Update bets status
        await tx.duelBet.updateMany({
          where: { matchId, userId: winnerId },
          data: { status: 'WON', resolvedAt: new Date() },
        })

        await tx.duelBet.updateMany({
          where: { matchId, userId: loserId },
          data: { status: 'LOST', resolvedAt: new Date() },
        })
      } else {
        // Draw - return stakes
        await tx.user.update({
          where: { id: match.creatorUserId },
          data: { totalDeals: { increment: 1 }, completedDeals: { increment: 1 } },
        })

        await tx.user.update({
          where: { id: match.opponentUserId },
          data: { totalDeals: { increment: 1 }, completedDeals: { increment: 1 } },
        })

        await tx.duelBet.updateMany({
          where: { matchId },
          data: { status: 'RETURNED', resolvedAt: new Date() },
        })
      }

      // Update match status
      await tx.duelMatch.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          winnerId,
          finishedAt: new Date(),
        },
      })

      // Update offer status
      await tx.duelOffer.update({
        where: { id: match.offerId },
        data: { status: 'MATCHED' },
      })
    })

    return {
      matchId,
      winnerId,
      loserId,
      totalGames: match.gamesPlayed,
      winnerGames: winnerId === match.creatorUserId ? creatorWins : opponentWins,
      loserGames: winnerId === match.creatorUserId ? opponentWins : creatorWins,
      draws,
      totalPointsWon: winnerId ? totalPointsAtStake : 0,
    }
  }

  /**
   * Get user's duel history
   */
  static async getUserDuelHistory(userId: string, limit: number = 10) {
    const matches = await prisma.duelMatch.findMany({
      where: {
        OR: [
          { creatorUserId: userId },
          { opponentUserId: userId },
        ],
        status: 'FINISHED',
      },
      include: {
        creator: { select: { id: true, username: true } },
        opponent: { select: { id: true, username: true } },
        offer: { select: { chipType: true, chipPointsValue: true } },
        games: { select: { winnerUserId: true } },
      },
      orderBy: { finishedAt: 'desc' },
      take: limit,
    })

    return matches.map((match) => {
      const isCreator = match.creatorUserId === userId
      const opponent = isCreator ? match.opponent : match.creator
      const userWins = match.games.filter(g => g.winnerUserId === userId).length
      const opponentWins = match.games.filter(g => g.winnerUserId === opponent.id).length

      return {
        id: match.id,
        opponent: opponent.username,
        chipType: match.offer.chipType,
        pointsValue: match.offer.chipPointsValue,
        result: match.winnerId === userId ? 'WIN' : match.winnerId ? 'LOSS' : 'DRAW',
        score: `${userWins}-${opponentWins}`,
        pointsChange: match.winnerId === userId 
          ? match.offer.chipPointsValue * match.gamesPlayed
          : match.winnerId 
            ? -match.offer.chipPointsValue * match.gamesPlayed
            : 0,
        finishedAt: match.finishedAt,
      }
    })
  }

  /**
   * Get user stats
   */
  static async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pointsBalance: true,
        totalDeals: true,
        completedDeals: true,
        reliabilityPercent: true,
      },
    })

    if (!user) return null

    // Count wins/losses
    const [wins, losses] = await Promise.all([
      prisma.duelMatch.count({
        where: { winnerId: userId, status: 'FINISHED' },
      }),
      prisma.duelMatch.count({
        where: {
          OR: [{ creatorUserId: userId }, { opponentUserId: userId }],
          winnerId: { not: null, notIn: [userId] },
          status: 'FINISHED',
        },
      }),
    ])

    const totalEarnings = await prisma.transaction.aggregate({
      where: { userId, type: { in: ['DUEL_WIN', 'DUEL_LOSS'] } },
      _sum: { amountPoints: true },
    })

    return {
      pointsBalance: user.pointsBalance,
      totalDuels: user.totalDeals,
      wins,
      losses,
      draws: user.totalDeals - wins - losses,
      winRate: user.totalDeals > 0 ? Math.round((wins / user.totalDeals) * 100) : 0,
      reliabilityPercent: user.reliabilityPercent,
      totalEarnings: totalEarnings._sum.amountPoints || 0,
    }
  }
}

