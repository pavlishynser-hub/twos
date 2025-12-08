/**
 * Confirm Order API
 * 
 * POST /api/p2p/orders/[orderId]/confirm - Confirm matched order (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { P2POrderService } from '@/server/services/p2pOrderService'
import { DuelGameService } from '@/server/services/duelGameService'

// Mock current user (order owner)
const getCurrentUser = () => ({
  id: 'user_123',
  username: 'Player1',
})

interface RouteParams {
  params: { orderId: string }
}

/**
 * POST /api/p2p/orders/[orderId]/confirm
 * Owner confirms the duel after opponent joins
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = getCurrentUser()
    
    // Confirm order
    const result = await P2POrderService.confirmOrder(params.orderId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Get order details for creating first game
    const order = result.order!
    
    // Create first game
    let game = null
    if (order.opponent) {
      game = await DuelGameService.createGame(
        order.id,
        1, // First game
        order.owner.id,
        order.owner.username,
        order.opponent.id,
        order.opponent.username
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        order: result.order,
        game,
        message: 'Duel confirmed! First game created.',
      },
    })
  } catch (error) {
    console.error('Error confirming order:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

