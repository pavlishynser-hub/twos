/**
 * Confirm Order API
 * 
 * POST /api/p2p/orders/[orderId]/confirm - Confirm matched order (owner only)
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
 * POST /api/p2p/orders/[orderId]/confirm
 * Owner confirms the duel after opponent joins
 */
export async function POST(
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
    console.log(`[Confirm] User ${user.id} confirming order ${orderId}`)
    
    // Confirm order using service (which validates and updates status)
    const result = await P2POrderService.confirmOrder(orderId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    console.log(`[Confirm] Order ${orderId} confirmed successfully`)

    return NextResponse.json({
      success: true,
      data: {
        offer: result.order,
        message: 'Duel confirmed! Ready to play.',
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
