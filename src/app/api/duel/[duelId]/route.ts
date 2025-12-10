/**
 * Duel Info API
 * GET /api/duel/[duelId] - Get full duel info for game page
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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { duelId } = await params

    // Get offer with all details
    const offer = await prisma.duelOffer.findUnique({
      where: { id: duelId },
      include: {
        creator: {
          select: { id: true, username: true }
        }
      }
    })

    if (!offer) {
      return NextResponse.json({ success: false, error: 'Duel not found' }, { status: 404 })
    }

    // Get opponent info if exists
    let opponentInfo = null
    if (offer.opponentUserId) {
      const opponent = await prisma.user.findUnique({
        where: { id: offer.opponentUserId },
        select: { id: true, username: true }
      })
      opponentInfo = opponent
    }

    // Check if user is participant
    const isCreator = offer.creatorUserId === user.id
    const isOpponent = offer.opponentUserId === user.id

    if (!isCreator && !isOpponent) {
      return NextResponse.json({ success: false, error: 'You are not in this duel' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: offer.id,
        creatorUserId: offer.creatorUserId,
        opponentUserId: offer.opponentUserId,
        creator: offer.creator,
        opponent: opponentInfo,
        chipType: offer.chipType,
        chipPointsValue: offer.chipPointsValue,
        gamesCount: offer.gamesCount,
        status: offer.status,
        // User context
        isCreator,
        isOpponent,
        myId: user.id,
        myUsername: user.username,
      },
    })
  } catch (error) {
    console.error('[DuelInfo] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

