/**
 * Submit Player Number API
 * POST /api/duel/[duelId]/submit - Submit player's number for a duel round
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { AuthService } from '@/server/services/authService'

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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { duelId } = await params
    const body = await request.json()
    const { roundNumber, playerNumber } = body

    console.log(`[Submit] User ${user.id} submitting number ${playerNumber} for duel ${duelId} round ${roundNumber}`)

    // Validate number
    if (!Number.isInteger(playerNumber) || playerNumber < 0 || playerNumber > 999999) {
      return NextResponse.json({ success: false, error: 'Invalid number (0-999999)' }, { status: 400 })
    }

    // Get the offer
    const offer = await prisma.duelOffer.findUnique({
      where: { id: duelId },
    })

    if (!offer) {
      return NextResponse.json({ success: false, error: 'Duel not found' }, { status: 404 })
    }

    console.log(`[Submit] Offer found: creator=${offer.creatorUserId}, opponent=${offer.opponentUserId}`)

    // Check user is participant
    const isCreator = offer.creatorUserId === user.id
    const isOpponent = offer.opponentUserId === user.id

    if (!isCreator && !isOpponent) {
      return NextResponse.json({ success: false, error: 'You are not in this duel' }, { status: 403 })
    }

    // Check opponent exists
    if (!offer.opponentUserId) {
      return NextResponse.json({ success: false, error: 'No opponent in this duel yet' }, { status: 400 })
    }

    // Get or create match
    let match = await prisma.duelMatch.findFirst({
      where: { offerId: duelId },
    })

    if (!match) {
      console.log(`[Submit] Creating new match for offer ${duelId}`)
      match = await prisma.duelMatch.create({
        data: {
          offerId: duelId,
          creatorUserId: offer.creatorUserId,
          opponentUserId: offer.opponentUserId,
          gamesPlanned: offer.gamesCount,
          gamesPlayed: 0,
          status: 'IN_PROGRESS',
        },
      })
    }

    // Get or create game for this round
    let game = await prisma.duelGame.findFirst({
      where: {
        matchId: match.id,
        roundIndex: roundNumber,
      },
    })

    if (!game) {
      console.log(`[Submit] Creating new game for match ${match.id} round ${roundNumber}`)
      game = await prisma.duelGame.create({
        data: {
          matchId: match.id,
          roundIndex: roundNumber,
          status: 'IN_PROGRESS',
        },
      })
    }

    // Parse existing metadata from roundSecret
    let metadata: any = {}
    if (game.roundSecret) {
      try {
        metadata = JSON.parse(game.roundSecret)
      } catch (e) {
        metadata = {}
      }
    }

    // Update with player's number
    if (isCreator) {
      metadata.creatorNumber = playerNumber
      metadata.creatorSubmittedAt = new Date().toISOString()
      metadata.creatorId = user.id
    } else {
      metadata.opponentNumber = playerNumber
      metadata.opponentSubmittedAt = new Date().toISOString()
      metadata.opponentId = user.id
    }

    // Save to roundSecret field
    await prisma.duelGame.update({
      where: { id: game.id },
      data: {
        roundSecret: JSON.stringify(metadata),
      },
    })

    // Check if both submitted
    const bothSubmitted = metadata.creatorNumber !== undefined && metadata.opponentNumber !== undefined

    console.log(`[Submit] Updated game ${game.id}: creatorNum=${metadata.creatorNumber}, opponentNum=${metadata.opponentNumber}, bothReady=${bothSubmitted}`)

    return NextResponse.json({
      success: true,
      data: {
        submitted: true,
        bothReady: bothSubmitted,
        myNumber: playerNumber,
        waitingForOpponent: !bothSubmitted,
      },
    })
  } catch (error) {
    console.error('[Submit] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
