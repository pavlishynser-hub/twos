/**
 * Duel Resolution API
 * POST /api/duel/resolve - Resolve a duel round and determine winner
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  determineWinner, 
  calculateTimeSlot,
  WinnerDeterminationParams 
} from '@/server/services/winnerDetermination'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.duelId || !body.roundNumber || !body.playerAId || !body.playerBId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: duelId, roundNumber, playerAId, playerBId' },
        { status: 400 }
      )
    }

    // Calculate current time slot
    const timeSlot = calculateTimeSlot()

    // Determine winner
    const params: WinnerDeterminationParams = {
      duelId: body.duelId,
      roundNumber: body.roundNumber,
      timeSlot,
      players: [body.playerAId, body.playerBId],
    }

    const result = determineWinner(params)

    return NextResponse.json({
      success: true,
      data: {
        winnerId: result.winnerId,
        loserId: result.loserId,
        winnerIndex: result.winnerIndex,
        verification: {
          duelId: result.verificationData.duelId,
          roundNumber: result.verificationData.roundNumber,
          timeSlot: result.verificationData.timeSlot,
          players: result.verificationData.players,
          seedSlice: result.verificationData.seedSlice,
          winnerIndex: result.verificationData.winnerIndex,
          formula: result.verificationData.formula,
        },
      },
    })
  } catch (error) {
    console.error('Duel resolution error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

