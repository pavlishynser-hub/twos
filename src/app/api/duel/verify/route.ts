/**
 * Duel Verification API
 * POST /api/duel/verify - Verify a duel result
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyResult, VerificationRequest } from '@/server/services/winnerDetermination'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.duelId || body.roundNumber === undefined || 
        body.timeSlot === undefined || !body.players || 
        !body.seedSlice || body.winnerIndex === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: duelId, roundNumber, timeSlot, players, seedSlice, winnerIndex' 
        },
        { status: 400 }
      )
    }

    const verificationRequest: VerificationRequest = {
      duelId: body.duelId,
      roundNumber: body.roundNumber,
      timeSlot: body.timeSlot,
      players: body.players,
      seedSlice: body.seedSlice,
      winnerIndex: body.winnerIndex,
    }

    const result = verifyResult(verificationRequest)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

