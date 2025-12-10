/**
 * Duel Status API
 * GET /api/duel/[duelId]/status - Check duel round status (both players ready?)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { AuthService } from '@/server/services/authService'
import { 
  determineWinner, 
  calculateTimeSlot,
  DuelRoundParams,
} from '@/server/services/winnerDetermination'

interface RouteParams {
  params: Promise<{ duelId: string }>
}

async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) return null

  const session = await AuthService.validateSession(token)
  if (!session.valid || !session.user) return null

  return session.user
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { duelId } = await params
    const { searchParams } = new URL(request.url)
    const roundNumber = parseInt(searchParams.get('round') || '1')

    // Get the offer
    const offer = await prisma.duelOffer.findUnique({
      where: { id: duelId },
      include: {
        creator: { select: { id: true, username: true } },
      },
    })

    if (!offer) {
      return NextResponse.json({ success: false, error: 'Duel not found' }, { status: 404 })
    }

    // Check user is participant
    const isCreator = offer.creatorUserId === user.id
    const isOpponent = offer.opponentUserId === user.id

    if (!isCreator && !isOpponent) {
      return NextResponse.json({ success: false, error: 'You are not in this duel' }, { status: 403 })
    }

    // Get match
    const match = await prisma.duelMatch.findFirst({
      where: { offerId: duelId },
    })

    if (!match) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'waiting',
          bothReady: false,
          mySubmitted: false,
          opponentSubmitted: false,
        },
      })
    }

    // Get game for this round
    const game = await prisma.duelGame.findFirst({
      where: {
        matchId: match.id,
        roundIndex: roundNumber,
      },
    })

    if (!game) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'waiting',
          bothReady: false,
          mySubmitted: false,
          opponentSubmitted: false,
        },
      })
    }

    // Parse metadata from roundSecret
    let metadata: any = {}
    if (game.roundSecret) {
      try {
        metadata = JSON.parse(game.roundSecret)
      } catch (e) {
        metadata = {}
      }
    }

    const creatorSubmitted = metadata.creatorNumber !== undefined
    const opponentSubmitted = metadata.opponentNumber !== undefined
    const bothReady = creatorSubmitted && opponentSubmitted

    const mySubmitted = isCreator ? creatorSubmitted : opponentSubmitted
    const theirSubmitted = isCreator ? opponentSubmitted : creatorSubmitted

    // If both ready, calculate result
    if (bothReady && game.status !== 'FINISHED') {
      const timeSlot = calculateTimeSlot()

      const params: DuelRoundParams = {
        duelId: `${duelId}_round_${roundNumber}`,
        roundNumber,
        timeSlot,
        playerA: {
          playerId: offer.creatorUserId,
          playerNumber: metadata.creatorNumber,
        },
        playerB: {
          playerId: offer.opponentUserId!,
          playerNumber: metadata.opponentNumber,
        },
      }

      const result = determineWinner(params)

      // Update game with result
      await prisma.duelGame.update({
        where: { id: game.id },
        data: {
          status: 'FINISHED',
          winnerUserId: result.winnerId,
          roundHashCommit: result.verification.seedSlice,
          finishedAt: new Date(),
        },
      })

      // Return result
      return NextResponse.json({
        success: true,
        data: {
          status: 'finished',
          bothReady: true,
          mySubmitted: true,
          opponentSubmitted: true,
          result: {
            randomNumber: result.randomNumber,
            creatorNumber: metadata.creatorNumber,
            opponentNumber: metadata.opponentNumber,
            creatorDistance: result.distanceA,
            opponentDistance: result.distanceB,
            winnerId: result.winnerId,
            isDraw: result.isDraw,
            verification: result.verification,
          },
        },
      })
    }

    // If game already finished, return stored result
    if (game.status === 'FINISHED') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'finished',
          bothReady: true,
          mySubmitted: true,
          opponentSubmitted: true,
          result: {
            creatorNumber: metadata.creatorNumber,
            opponentNumber: metadata.opponentNumber,
            winnerId: game.winnerUserId,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: bothReady ? 'ready' : 'waiting',
        bothReady,
        mySubmitted,
        opponentSubmitted: theirSubmitted,
      },
    })
  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

