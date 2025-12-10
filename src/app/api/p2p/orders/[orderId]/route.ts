/**
 * Single Order API
 * 
 * GET /api/p2p/orders/[orderId] - Get order details
 * DELETE /api/p2p/orders/[orderId] - Cancel order
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { P2POrderService } from '@/server/services/p2pOrderService'
import { AuthService } from '@/server/services/authService'

interface RouteParams {
  params: Promise<{ orderId: string }>
}

/**
 * Get current user from session
 */
async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return null
  }

  const session = await AuthService.validateSession(token)
  if (!session.valid || !session.user) {
    return null
  }

  return session.user
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
    const { orderId } = await params
    const order = await P2POrderService.getOrder(orderId)

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
 * Cancel order (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { orderId } = await params
    const result = await P2POrderService.cancelOrder(orderId, user.id)

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
