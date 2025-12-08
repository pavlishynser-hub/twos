/**
 * Single P2P Order API
 * 
 * GET /api/p2p/orders/[orderId] - Get order details
 * DELETE /api/p2p/orders/[orderId] - Cancel order
 */

import { NextRequest, NextResponse } from 'next/server'
import { P2POrderService } from '@/server/services/p2pOrderService'

// Mock current user
const getCurrentUser = () => ({
  id: 'user_123',
  username: 'Player1',
})

interface RouteParams {
  params: { orderId: string }
}

/**
 * GET /api/p2p/orders/[orderId]
 * Get order details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const order = await P2POrderService.getOrder(params.orderId)

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/p2p/orders/[orderId]
 * Cancel order (only if OPEN and by owner)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = getCurrentUser()
    const result = await P2POrderService.cancelOrder(params.orderId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

