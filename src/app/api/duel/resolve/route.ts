/**
 * Duel Resolution API
 * POST /api/duel/resolve - Resolve a duel round with player numbers
 * 
 * МЕХАНИКА:
 * - Оба игрока ввели свои числа (0-999,999)
 * - Алгоритм генерирует случайное число
 * - Побеждает тот, чьё число ближе к случайному
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  determineWinner, 
  calculateTimeSlot,
  validatePlayerNumber,
  DuelRoundParams,
  MAX_NUMBER,
  MIN_NUMBER,
} from '@/server/services/winnerDetermination'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['duelId', 'roundNumber', 'playerAId', 'playerBId', 'playerANumber', 'playerBNumber']
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate player numbers
    const playerANumber = Number(body.playerANumber)
    const playerBNumber = Number(body.playerBNumber)

    const validationA = validatePlayerNumber(playerANumber)
    if (!validationA.valid) {
      return NextResponse.json(
        { success: false, error: `Player A: ${validationA.error}` },
        { status: 400 }
      )
    }

    const validationB = validatePlayerNumber(playerBNumber)
    if (!validationB.valid) {
      return NextResponse.json(
        { success: false, error: `Player B: ${validationB.error}` },
        { status: 400 }
      )
    }

    // Calculate current time slot
    const timeSlot = calculateTimeSlot()

    // Determine winner
    const params: DuelRoundParams = {
      duelId: body.duelId,
      roundNumber: body.roundNumber,
      timeSlot,
      playerA: {
        playerId: body.playerAId,
        playerNumber: playerANumber,
      },
      playerB: {
        playerId: body.playerBId,
        playerNumber: playerBNumber,
      },
    }

    const result = determineWinner(params)

    return NextResponse.json({
      success: true,
      data: {
        randomNumber: result.randomNumber,
        playerA: {
          id: body.playerAId,
          number: result.playerANumber,
          distance: result.distanceA,
        },
        playerB: {
          id: body.playerBId,
          number: result.playerBNumber,
          distance: result.distanceB,
        },
        winnerId: result.winnerId,
        loserId: result.loserId,
        winnerIndex: result.winnerIndex,
        isDraw: result.isDraw,
        verification: result.verification,
        config: {
          minNumber: MIN_NUMBER,
          maxNumber: MAX_NUMBER,
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
