/**
 * Game Result API
 * 
 * POST /api/p2p/games/[gameId]/result - Submit TOTP code for game
 * GET /api/p2p/games/[gameId]/result - Get game result and fairness proof
 */

import { NextRequest, NextResponse } from 'next/server'
import { DuelGameService } from '@/server/services/duelGameService'

// Mock current user
const getCurrentUser = () => ({
  id: 'user_123',
  username: 'Player1',
})

interface RouteParams {
  params: { gameId: string }
}

/**
 * POST /api/p2p/games/[gameId]/result
 * Submit player's TOTP code
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json()
    const user = getCurrentUser()

    if (!body.code) {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      )
    }

    // Validate code format
    if (!/^\d{6}$/.test(body.code)) {
      return NextResponse.json(
        { success: false, error: 'Code must be exactly 6 digits' },
        { status: 400 }
      )
    }

    const result = await DuelGameService.submitPlayerCode(
      params.gameId,
      user.id,
      body.code
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.game,
    })
  } catch (error) {
    console.error('Error submitting game result:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/p2p/games/[gameId]/result
 * Get game result with fairness proof (revealed after completion)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const game = await DuelGameService.getGame(params.gameId, true)

    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: game,
    })
  } catch (error) {
    console.error('Error fetching game result:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

