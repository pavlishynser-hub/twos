/**
 * My Skins API
 * GET /api/skins/my - Get user's skins
 */

import { NextResponse } from 'next/server'
import { ExchangeService } from '@/server/services/exchangeService'

// Mock current user
const getCurrentUser = () => ({ id: 'user_1', username: 'Player1' })

export async function GET() {
  try {
    const user = getCurrentUser()
    const skins = await ExchangeService.getUserSkins(user.id)
    const balance = await ExchangeService.getUserBalance(user.id)

    return NextResponse.json({
      success: true,
      data: {
        skins,
        balance,
      },
    })
  } catch (error) {
    console.error('Error fetching user skins:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


