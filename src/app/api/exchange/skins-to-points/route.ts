/**
 * Skins to Points Exchange API
 * POST /api/exchange/skins-to-points
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExchangeService } from '@/server/services/exchangeService'

// Mock current user
const getCurrentUser = () => ({ id: 'user_1', username: 'Player1' })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = getCurrentUser()

    if (!body.userSkinIds || !Array.isArray(body.userSkinIds)) {
      return NextResponse.json(
        { success: false, error: 'userSkinIds array is required' },
        { status: 400 }
      )
    }

    if (body.userSkinIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one skin must be selected' },
        { status: 400 }
      )
    }

    const result = await ExchangeService.skinsToPoints(user.id, body.userSkinIds)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        addedPoints: result.addedPoints,
        newBalance: result.newBalance,
        convertedSkins: result.convertedSkins,
      },
    })
  } catch (error) {
    console.error('Error converting skins to points:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

