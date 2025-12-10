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

    // Check user is participant
    const isCreator = offer.creatorUserId === user.id
    const isOpponent = offer.opponentUserId === user.id

    if (!isCreator && !isOpponent) {
      return NextResponse.json({ success: false, error: 'You are not in this duel' }, { status: 403 })
    }

    // Create or update game record
    const gameKey = `${duelId}_round_${roundNumber}`
    
    // Try to find existing game or create new one
    let game = await prisma.duelGame.findFirst({
      where: {
        matchId: duelId,
        roundIndex: roundNumber,
      },
    })

    // For simplicity, store in a simple key-value approach
    // We'll use the DuelGame table with custom fields via metadata
    // But since schema doesn't have all fields, use a simpler approach:
    // Store submissions in memory with Redis-like approach using metadata field

    // Get or create match first
    let match = await prisma.duelMatch.findFirst({
      where: { offerId: duelId },
    })

    if (!match) {
      // Create match
      match = await prisma.duelMatch.create({
        data: {
          offerId: duelId,
          creatorUserId: offer.creatorUserId,
          opponentUserId: offer.opponentUserId!,
          gamesPlanned: offer.gamesCount,
          gamesPlayed: 0,
          status: 'IN_PROGRESS',
        },
      })
    }

    // Get or create game
    if (!game) {
      game = await prisma.duelGame.create({
        data: {
          matchId: match.id,
          roundIndex: roundNumber,
          status: 'IN_PROGRESS',
        },
      })
    }

    // Update game with player's number using metadata
    // Store as JSON: { creatorNumber, opponentNumber, creatorSubmittedAt, opponentSubmittedAt }
    const currentMetadata = (game as any).metadata || {}
    const metadata = typeof currentMetadata === 'string' ? JSON.parse(currentMetadata) : currentMetadata
    
    if (isCreator) {
      metadata.creatorNumber = playerNumber
      metadata.creatorSubmittedAt = new Date().toISOString()
    } else {
      metadata.opponentNumber = playerNumber
      metadata.opponentSubmittedAt = new Date().toISOString()
    }

    // Update game - but DuelGame doesn't have metadata field
    // Let's use roundSecret field to store JSON temporarily
    await prisma.duelGame.update({
      where: { id: game.id },
      data: {
        roundSecret: JSON.stringify(metadata),
      },
    })

    // Check if both submitted
    const bothSubmitted = metadata.creatorNumber !== undefined && metadata.opponentNumber !== undefined

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
    console.error('Submit error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

