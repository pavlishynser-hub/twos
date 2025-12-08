/**
 * Join Order API
 * 
 * POST /api/p2p/orders/[orderId]/join - Join an open order
 */

import { NextRequest, NextResponse } from 'next/server'
import { P2POrderService } from '@/server/services/p2pOrderService'

// Mock current user (different from order owner)
const getCurrentUser = () => ({
  id: 'user_456',
  username: 'Opponent',
})

interface RouteParams {
  params: { orderId: string }
}

/**
 * POST /api/p2p/orders/[orderId]/join
 * Join someone else's order as opponent
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = getCurrentUser()
    
    const result = await P2POrderService.joinOrder(
      params.orderId,
      user.id,
      user.username
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        order: result.order,
        expiresAt: result.expiresAt,
        message: 'Waiting for owner confirmation. You have 2 minutes.',
      },
    })
  } catch (error) {
    console.error('Error joining order:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

