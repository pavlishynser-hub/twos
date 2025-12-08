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
    const requiredFields = [
      'duelId', 'roundNumber', 'timeSlot', 
      'playerAId', 'playerANumber', 
      'playerBId', 'playerBNumber',
      'seedSlice', 'claimedWinnerIndex'
    ]
    
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const verificationRequest: VerificationRequest = {
      duelId: body.duelId,
      roundNumber: body.roundNumber,
      timeSlot: body.timeSlot,
      playerAId: body.playerAId,
      playerANumber: Number(body.playerANumber),
      playerBId: body.playerBId,
      playerBNumber: Number(body.playerBNumber),
      seedSlice: body.seedSlice,
      claimedWinnerIndex: body.claimedWinnerIndex,
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
