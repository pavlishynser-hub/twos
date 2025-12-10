/**
 * Points to Skin Exchange API
 * POST /api/exchange/points-to-skin
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExchangeService } from '@/server/services/exchangeService'

// Mock current user
const getCurrentUser = () => ({ id: 'user_1', username: 'Player1' })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = getCurrentUser()

    if (!body.skinId) {
      return NextResponse.json(
        { success: false, error: 'skinId is required' },
        { status: 400 }
      )
    }

    const result = await ExchangeService.pointsToSkin(user.id, body.skinId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        newUserSkin: result.newUserSkin,
        newBalance: result.newBalance,
      },
    })
  } catch (error) {
    console.error('Error converting points to skin:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


